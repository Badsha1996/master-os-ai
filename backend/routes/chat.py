import json
import re
import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from llm.llm_client import LLMClient, CancelledException
from utility.get_llm_client import get_llm_client
from tools.tools import execute_tool
from tools.smart_router import SmartTaskRouter, execute_direct
from tools.advanced_gui_tools import GUI_TOOLS

logger = logging.getLogger("optimized_chat")

class ChatInput(BaseModel):
    text: str = Field(..., min_length=1)
    context: str = Field(default="") 
    temperature: float = Field(default=0.7, ge=0.1, le=2.0)
    max_tokens: int = Field(default=2048, ge=128, le=4096)

chat_router = APIRouter(prefix="/chat", tags=["Chat"])

# Initialize smart router
smart_router = SmartTaskRouter()

@chat_router.post("/stream")
async def chat_stream_optimized(
    req: ChatInput, 
    request: Request, 
    llm: LLMClient = Depends(get_llm_client)
):
    async def event_generator():
        # ============ SMART ROUTING ============
        # Try direct execution first (bypasses LLM entirely)
        direct_action = smart_router.route(req.text)
        
        if direct_action:
            tool_name, params = direct_action
            
            # Handle instant conversational responses
            if tool_name == "instant_answer":
                answer = params["answer"]
                logger.info(f"⚡ INSTANT: {req.text[:50]} -> {answer[:50]}")
                
                yield f"data: {json.dumps({'type': 'status', 'status': 'instant_response'})}\n\n"
                yield f"data: {json.dumps({'type': 'done', 'answer': answer})}\n\n"
                return
            
            # Handle tool-based direct execution
            logger.info(f"⚡ FAST PATH: {req.text} -> {tool_name}")
            
            yield f"data: {json.dumps({'type': 'status', 'status': 'direct_execution'})}\n\n"
            yield f"data: {json.dumps({'type': 'action', 'tool': tool_name, 'params': params})}\n\n"
            
            try:
                result = execute_direct(tool_name, params)
                
                yield f"data: {json.dumps({'type': 'observation', 'text': result})}\n\n"
                yield f"data: {json.dumps({'type': 'done', 'answer': result})}\n\n"
                
                logger.info(f"✅ Direct execution completed: {result[:100]}")
                return
                
            except Exception as e:
                logger.error(f"❌ Direct execution failed: {e}")
                yield f"data: {json.dumps({'type': 'error', 'error': f'Direct execution failed: {str(e)}'})}\n\n"
                return
        
        # ============ LLM REASONING PATH ============
        # For complex tasks that need reasoning
        
        # Quick check: Does this even need LLM?
        if not smart_router.needs_llm(req.text):
            # Simple acknowledgment or unclear input
            simple_responses = [
                "I'm here to help! You can ask me to open apps, search the web, control your system, and much more.",
                "Not sure what you mean. Try commands like 'open chrome', 'search youtube', or 'set brightness to 50'.",
                "Ready when you are! I can help with apps, files, web searches, and system controls.",
            ]
            import random
            answer = random.choice(simple_responses)
            
            yield f"data: {json.dumps({'type': 'done', 'answer': answer})}\n\n"
            return
        
        if not await llm.ensure_loaded():
            yield f"data: {json.dumps({'type': 'error', 'error': 'Model failed to load'})}\n\n"
            return

        yield f"data: {json.dumps({'type': 'status', 'status': 'reasoning'})}\n\n"
        
        from llm.prompt_engine import build_mistral_prompt
        
        conversation_history = [
            {"role": "user", "content": req.text}
        ]
        
        step_count = 0
        max_steps = 6  # Reduced from 8 - force efficiency
        
        try:
            while step_count < max_steps:
                step_count += 1
                logger.info(f"🔄 Step {step_count}/{max_steps}")
                
                prompt = build_mistral_prompt(conversation_history)
                
                buffer = ""
                thought_buffer = ""
                in_thought = True
                in_action = False
                action_detected = False
                
                yield f"data: {json.dumps({'type': 'phase', 'phase': 'thinking', 'step': step_count})}\n\n"
                
                async for chunk_json in llm.stream(prompt, req.context):
                    if await request.is_disconnected():
                        raise CancelledException("Client disconnected")
                    
                    try:
                        data = json.loads(chunk_json)
                        token = data.get("text", "")
                        
                        if not token:
                            continue
                        
                        buffer += token
                        
                        # Detect Final Answer early
                        if "Final Answer:" in buffer:
                            answer_match = re.search(r"Final Answer:\s*(.*)", buffer, re.DOTALL)
                            if answer_match:
                                answer = answer_match.group(1).strip()
                                yield f"data: {json.dumps({'type': 'done', 'answer': answer})}\n\n"
                                return
                        
                        # Thought phase
                        if in_thought and not in_action:
                            thought_buffer += token
                            
                            if "Action:" in buffer:
                                in_thought = False
                                in_action = True
                                
                                thought_match = re.search(r"Thought:\s*(.*?)(?=Action:|$)", buffer, re.DOTALL)
                                if thought_match:
                                    final_thought = thought_match.group(1).strip()
                                    yield f"data: {json.dumps({'type': 'thought', 'text': final_thought})}\n\n"
                                
                                yield f"data: {json.dumps({'type': 'phase', 'phase': 'action'})}\n\n"
                                continue
                            
                            # Stream thoughts in real-time
                            if len(thought_buffer) > 20:  # Buffer to avoid token spam
                                yield f"data: {json.dumps({'type': 'thought_chunk', 'text': token})}\n\n"
                        
                        # Action phase
                        elif in_action:
                            # Match action pattern more aggressively
                            action_pattern = re.search(
                                r'Action:\s*(\w+)\s*Action Input:\s*(\{[^}]*\})', 
                                buffer, 
                                re.DOTALL | re.IGNORECASE
                            )
                            
                            if action_pattern:
                                tool_name = action_pattern.group(1).strip()
                                params_str = action_pattern.group(2).strip()
                                
                                try:
                                    params = json.loads(params_str)
                                    action_detected = True
                                    
                                    logger.info(f"🔧 Executing: {tool_name}({params})")
                                    
                                    yield f"data: {json.dumps({'type': 'action', 'tool': tool_name, 'params': params})}\n\n"
                                    
                                    # Execute tool (check both registries)
                                    if tool_name in GUI_TOOLS:
                                        observation = GUI_TOOLS[tool_name](**params)
                                    else:
                                        observation = execute_tool(tool_name, params)
                                    
                                    logger.info(f"📊 Result: {observation[:150]}")
                                    
                                    yield f"data: {json.dumps({'type': 'observation', 'text': observation})}\n\n"
                                    
                                    # Add to conversation history
                                    conversation_history.append({
                                        "role": "assistant",
                                        "content": buffer.strip()
                                    })
                                    conversation_history.append({
                                        "role": "system",
                                        "content": f"Observation: {observation}"
                                    })
                                    
                                    # Break to next iteration
                                    break
                                    
                                except json.JSONDecodeError as e:
                                    logger.warning(f"JSON parse error: {e}")
                                    continue
                    
                    except json.JSONDecodeError:
                        continue
                
                # If no action detected and no final answer, force completion
                if not action_detected:
                    if buffer.strip():
                        clean_response = buffer.replace("Thought:", "").strip()
                        yield f"data: {json.dumps({'type': 'done', 'answer': clean_response})}\n\n"
                    else:
                        yield f"data: {json.dumps({'type': 'error', 'error': 'No response generated'})}\n\n"
                    return
            
            # Max steps reached
            logger.warning(f"⚠️ Max steps reached")
            yield f"data: {json.dumps({'type': 'done', 'answer': 'Task complexity limit reached. Try breaking it into smaller steps.'})}\n\n"
        
        except CancelledException:
            logger.info("⚠️ Cancelled by user")
            yield f"data: {json.dumps({'type': 'cancelled'})}\n\n"
        
        except Exception as e:
            logger.error(f"❌ Error: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@chat_router.post("/cancel")
async def cancel_generation(llm: LLMClient = Depends(get_llm_client)):
    logger.info("⚠️ Cancellation requested")
    return await llm.cancel_all()

@chat_router.get("/status")
async def get_status(llm: LLMClient = Depends(get_llm_client)):
    health = await llm.health_check()
    return {
        "model_loaded": health.get("model_loaded", False),
        "acceleration": health.get("acceleration", "unknown"),
        "status": health.get("status", "unknown"),
        "smart_routing": True
    }

@chat_router.get("/metrics")
async def get_metrics(llm: LLMClient = Depends(get_llm_client)):
    health = await llm.get_metrics()
    # future 
    pass