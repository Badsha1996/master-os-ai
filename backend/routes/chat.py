import json
import re
import logging
import asyncio
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, AsyncIterator

from llm.llm_client import LLMClient, CancelledException
from utility.get_llm_client import get_llm_client
from tools.tools import execute_tool, get_tools_description, TOOL_SCHEMAS

logger = logging.getLogger("chat")

class ChatInput(BaseModel):
    text: str = Field(..., min_length=1)
    context: str = Field(default="") 
    temperature: float = Field(default=0.7, ge=0.1, le=2.0)
    max_tokens: int = Field(default=2048, ge=128, le=4096)

chat_router = APIRouter(prefix="/chat", tags=["Chat"])

async def ensure_model_loaded(llm: LLMClient, max_retries: int = 3) -> bool:
    """Ensure model is loaded with auto-retry logic."""
    for attempt in range(max_retries):
        try:
            health = await llm.health_check()
            if health.get("model_loaded"):
                logger.info("✅ Model already loaded")
                return True
            
            logger.warning(f"⚠️ Model not loaded. Loading... (Attempt {attempt + 1}/{max_retries})")
            await llm.load_model(gpu_layers=99)
            
            health = await llm.health_check()
            if health.get("model_loaded"):
                logger.info("✅ Model loaded successfully")
                return True
                
        except Exception as e:
            logger.error(f"❌ Load attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)
            
    return False

def construct_react_prompt(user_query: str, tools_desc: str, history: list = []) -> str:
    """
    Construct a ReAct prompt for the LLM.
    Format: Thought -> Action -> Observation loop until Final Answer
    """
    
    system_prompt = f"""You are Master-OS (MOS), a helpful AI assistant that can use tools to help users.

{tools_desc}

CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THIS FORMAT EXACTLY:

You MUST think step-by-step using this format:

Thought: [Your reasoning about what to do next]
Action: {{"tool": "tool_name", "params": {{"param1": "value1"}}}}
Observation: [You will receive the tool result here]

After receiving observations, continue thinking:
Thought: [Analyze the observation and decide next action]
Action: {{"tool": "another_tool", "params": {{}}}}
Observation: [Tool result]

When you have enough information, provide the final answer:
Thought: I now have all the information needed
Action: {{"tool": "final_answer", "params": {{"answer": "Your complete response to the user"}}}}

IMPORTANT RULES:
1. Always start with a Thought
2. Each Action must be valid JSON with "tool" and "params"
3. Wait for Observation before next Thought
4. Use final_answer tool when ready to respond
5. Be conversational and helpful in your final answer

EXAMPLES:

User: "I'm feeling sad, play some music and dim my screen"

Thought: The user is feeling sad and wants two things: music and dimmed screen. I should first play calming music, then adjust brightness.
Action: {{"tool": "play_spotify", "params": {{"mood": "sad"}}}}
Observation: Opened Spotify searching for 'sad' playlists
Thought: Good, music is playing. Now I'll dim the screen to help them relax.
Action: {{"tool": "set_brightness", "params": {{"value": 30}}}}
Observation: Successfully set screen brightness to 30%
Thought: Both tasks completed successfully. I should provide a caring response.
Action: {{"tool": "final_answer", "params": {{"answer": "I've opened Spotify with some calming music for you, and dimmed your screen to 30%. Take care of yourself. If you need anything else, I'm here."}}}}

User: "What time is it?"

Thought: User wants to know the current time. I'll use the get_current_time tool.
Action: {{"tool": "get_current_time", "params": {{}}}}
Observation: Current time: Monday, January 15, 2026 at 02:30 PM
Thought: I have the time information now.
Action: {{"tool": "final_answer", "params": {{"answer": "It's currently Monday, January 15, 2026 at 2:30 PM."}}}}

User: "Tell me a joke"

Thought: User wants a joke. This doesn't require any tools, I can respond directly.
Action: {{"tool": "final_answer", "params": {{"answer": "Why don't scientists trust atoms? Because they make up everything! 😄"}}}}

Now respond to: {user_query}
"""

    # If there's conversation history, append it
    if history:
        system_prompt += "\n\nPrevious conversation:\n"
        for entry in history:
            system_prompt += f"{entry}\n"
    
    return system_prompt + "\nThought:"

async def parse_react_response(stream_iter: AsyncIterator[str]) -> AsyncIterator[dict]:
    """
    Parse streaming tokens and extract Thought/Action/Observation structure.
    Yields structured events to frontend.
    """
    buffer = ""
    current_thought = ""
    in_thought = False
    in_action = False
    # Track if we have entered any specific phase yet
    has_started_structure = False 
    
    async for chunk_json in stream_iter:
        try:
            data = json.loads(chunk_json)
            token = data.get("text", "")
            
            if not token:
                continue
            
            buffer += token
            
            # --- FAILSAFE: Detect if model is just talking (No Thought/Action structure) ---
            # If we have a reasonable amount of text (e.g., 20 chars) and haven't seen 
            # "Thought:" or "Action:", assume it's a direct response.
            if not has_started_structure and len(buffer) > 20:
                if "Thought:" not in buffer and "Action:" not in buffer:
                    # Flush buffer as a standard answer part
                    yield {"type": "done", "answer": buffer} 
                    # Note: Ideally you stream this, but for simplicity we yield what we have
                    # and let the next chunks append to 'answer' in the frontend if you adjust it,
                    # or better: treating it as a "thought" effectively communicates it's processing
                    # but for this specific ReAct parser, let's treat it as a final answer stream.
                    
                    # Actually, the cleaner way for your UI:
                    # If it's just talking, treat it as a final answer update (stream it).
                    # Your UI expects "done" to be the *end*, so we need a new type or 
                    # just yield "observation" or "thought" as fallback.
                    
                    # BEST APPROACH for current UI: Treat rogue text as "Thought" 
                    # so the user at least sees it, OR modify UI to handle "answer_part".
                    # Let's try to detect the start of a Thought late.
                    pass

            # 1. Detect Thought
            if "Thought:" in buffer and not in_thought:
                in_thought = True
                has_started_structure = True
                current_thought = ""
                yield {"type": "phase", "phase": "thinking"}
            
            if in_thought:
                # Extract thought content
                thought_match = re.search(r"Thought:\s*(.*?)(?=Action:|$)", buffer, re.DOTALL)
                if thought_match:
                    thought_text = thought_match.group(1).strip()
                    if thought_text != current_thought:
                        new_chunk = thought_text[len(current_thought):]
                        current_thought = thought_text
                        yield {"type": "thought", "text": new_chunk}
                
                # Check if Action is starting
                if "Action:" in buffer:
                    in_thought = False
                    in_action = True
                    yield {"type": "phase", "phase": "action"}
            
            # 2. Detect Action
            if in_action:
                # Try to extract complete Action JSON
                # More robust Action detection
                action_match = re.search(r"Action:.*?(\{.*\})", buffer, re.DOTALL)
                if action_match:
                    try:
                        action_json = action_match.group(1)
                        action_data = json.loads(action_json)
                        
                        tool_name = action_data.get("tool")
                        params = action_data.get("params", {})
                        
                        logger.info(f"🔧 Executing tool: {tool_name}")
                        yield {"type": "action", "tool": tool_name, "params": params}
                        
                        # Execute tool
                        observation = execute_tool(tool_name, params)
                        
                        logger.info(f"📊 Observation: {observation[:100]}...")
                        yield {"type": "observation", "text": observation}
                        
                        # Clear buffer after action to keep it clean for next loop
                        buffer = "" 
                        in_action = False
                        
                        # Check if this was final_answer
                        if tool_name == "final_answer":
                            yield {"type": "done", "answer": params.get("answer", "")}
                            return
                        
                    except json.JSONDecodeError as e:
                        # JSON might be incomplete (streaming), just wait for more tokens
                        continue
            
            # 3. Handle "Rogue" Output (Model ignores instructions and just talks)
            if not has_started_structure and not in_thought and not in_action:
                # If the buffer is getting long and doesn't look like it's starting a thought...
                # We just stream it as a "thought" so the user sees raw output, 
                # OR we break and assume it's the answer. 
                # A simple trick: Just yield the token as a 'thought' if we are not in a strict block yet.
                # This makes the "Thinking" box show the raw response, which is better than empty.
                yield {"type": "thought", "text": token}

        except Exception as e:
            logger.error(f"❌ Parse error: {e}")
            continue

@chat_router.post("/stream")
async def text_to_text_stream(
    req: ChatInput, 
    request: Request, 
    llm: LLMClient = Depends(get_llm_client)
):
    async def event_generator():
        # 1. Setup
        if not await ensure_model_loaded(llm):
            yield f"data: {json.dumps({'type': 'error', 'error': 'Model failed to load'})}\n\n"
            return

        yield f"data: {json.dumps({'type': 'status', 'status': 'starting'})}\n\n"
        
        tools_desc = get_tools_description()
        # Initialize conversation with the System Prompt
        current_prompt = construct_react_prompt(req.text, tools_desc)
        
        step_count = 0
        max_steps = 10
        keep_going = True

        try:
            while keep_going and step_count < max_steps:
                step_count += 1
                logger.info(f"🔄 ReAct Step {step_count}")

                # Buffers for this specific step
                buffer = ""
                current_thought = ""
                in_action_block = False
                action_json_buffer = ""
                
                # We need to detect if the model stopped because it wants an observation
                model_stopped_for_action = False

                # 2. Stream from LLM
                # CRITICAL: We pass stop=["Observation:"] to ensure the LLM pauses 
                # so Python can execute the tool.
                async for chunk_json in llm.stream(
                    current_prompt, 
                    req.context, 
                    # Stop exactly here
                ):
                    if await request.is_disconnected():
                        raise CancelledException("Client disconnected")

                    try:
                        data = json.loads(chunk_json)
                        token = data.get("text", "")
                        
                        buffer += token

                        # -- DETECT PHASES --
                        
                        # Detect transition from Thought to Action
                        if "Action:" in buffer and not in_action_block:
                            in_action_block = True
                            # Send phase update to UI
                            yield f"data: {json.dumps({'type': 'phase', 'phase': 'action'})}\n\n"
                            
                            # Clean the token if it contains the keyword
                            # (This helps prevent "Action:" appearing in the JSON buffer)
                            split_point = token.find("Action:")
                            if split_point != -1:
                                # Add the part before Action: to thought
                                current_thought += token[:split_point]
                                # Add the part after Action: to action buffer
                                action_json_buffer += token[split_point + len("Action:"):]
                                token = "" # We handled this token manually
                        
                        if in_action_block:
                            action_json_buffer += token
                            # We don't yield JSON tokens as "thought", we keep them hidden 
                            # or yield them as a separate type if you want the user to see raw JSON code.
                            # For now, let's yield them so the user sees the code typing out:
                            yield f"data: {json.dumps({'type': 'action_chunk', 'text': token})}\n\n"
                        else:
                            # It is a thought
                            current_thought += token
                            yield f"data: {json.dumps({'type': 'thought', 'text': token})}\n\n"

                    except json.JSONDecodeError:
                        continue

                # -- END OF STREAM LOOP FOR THIS STEP --
                # The model has stopped generating. Now we process what we have.

                # 3. Check for Actions
                # We look for the last occurrence of valid JSON in the buffer
                action_match = re.search(r"(\{.*\})", action_json_buffer, re.DOTALL)
                
                if action_match:
                    action_str = action_match.group(1)
                    try:
                        action_data = json.loads(action_str)
                        tool_name = action_data.get("tool")
                        params = action_data.get("params", {})

                        # Send parsed action to UI (Make it look pretty)
                        yield f"data: {json.dumps({'type': 'action_parsed', 'tool': tool_name, 'params': params})}\n\n"

                        # --- EXECUTE TOOL ---
                        if tool_name == "final_answer":
                            answer = params.get("answer", "")
                            yield f"data: {json.dumps({'type': 'done', 'answer': answer})}\n\n"
                            keep_going = False
                        else:
                            # Execute real Python tool
                            observation = execute_tool(tool_name, params)
                            
                            # Send Observation to UI
                            yield f"data: {json.dumps({'type': 'observation', 'text': observation})}\n\n"
                            
                            # Append result to prompt for the next loop
                            # We reconstruct what the model generated + our observation
                            current_prompt += f"{buffer}\nObservation: {observation}\nThought:"

                    except json.JSONDecodeError:
                        logger.error(f"Invalid JSON from LLM: {action_str}")
                        # Force a retry or ask LLM to correct (simplified here: just stop)
                        yield f"data: {json.dumps({'type': 'error', 'error': 'LLM generated invalid JSON'})}\n\n"
                        keep_going = False
                else:
                    # No action found. 
                    # If we are here, the model stopped but didn't output an action.
                    # It might be a direct answer or a hallucinated stop.
                    if not in_action_block and current_thought.strip():
                         # Treat as final answer if it just talked
                         yield f"data: {json.dumps({'type': 'done', 'answer': current_thought})}\n\n"
                    keep_going = False

            if step_count >= max_steps:
                 yield f"data: {json.dumps({'type': 'error', 'error': 'Max ReAct steps reached'})}\n\n"

        except CancelledException:
            logger.info("Request cancelled")
        except Exception as e:
            logger.error(f"Error in stream: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache", 
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no" # Important for Nginx/Proxies to not buffer
        }
    )

@chat_router.post("/cancel")
async def cancel_generation(llm: LLMClient = Depends(get_llm_client)):
    """Cancel ongoing generation."""
    logger.info("⚠️ Cancellation requested")
    return await llm.cancel_all()

@chat_router.get("/status")
async def get_status(llm: LLMClient = Depends(get_llm_client)):
    """Get current model status."""
    health = await llm.health_check()
    return {
        "model_loaded": health.get("model_loaded", False),
        "acceleration": health.get("acceleration", "unknown"),
        "status": health.get("status", "unknown")
    }