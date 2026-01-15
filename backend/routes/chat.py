import json
import re
import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from llm.llm_client import LLMClient, CancelledException
from utility.get_llm_client import get_llm_client
from tools.tools import execute_tool

logger = logging.getLogger("chat")

class ChatInput(BaseModel):
    text: str = Field(..., min_length=1)
    context: str = Field(default="") 
    temperature: float = Field(default=0.7, ge=0.1, le=2.0)
    max_tokens: int = Field(default=2048, ge=128, le=4096)

chat_router = APIRouter(prefix="/chat", tags=["Chat"])

@chat_router.post("/stream")
async def chat_stream(
    req: ChatInput, 
    request: Request, 
    llm: LLMClient = Depends(get_llm_client)
):
    async def event_generator():
        if not await llm.ensure_loaded():
            yield f"data: {json.dumps({'type': 'error', 'error': 'Model failed to load'})}\n\n"
            return

        yield f"data: {json.dumps({'type': 'status', 'status': 'starting'})}\n\n"
        
        from llm.prompt_engine import build_mistral_prompt
        
        conversation_history = [
            {"role": "user", "content": req.text}
        ]
        
        step_count = 0
        max_steps = 8  
        
        try:
            while step_count < max_steps:
                step_count += 1
                logger.info(f"🔄 ReAct Step {step_count}/{max_steps}")
                
                prompt = build_mistral_prompt(conversation_history)
                
                buffer = ""
                thought_buffer = ""
                action_buffer = ""
                in_thought = True
                in_action = False
                action_detected = False
                final_answer_detected = False
                
                yield f"data: {json.dumps({'type': 'phase', 'phase': 'thinking'})}\n\n"
                
                async for chunk_json in llm.stream(
                    prompt, 
                    req.context,
                ):
                    if await request.is_disconnected():
                        raise CancelledException("Client disconnected")
                    
                    try:
                        data = json.loads(chunk_json)
                        token = data.get("text", "")
                        
                        if not token:
                            continue
                        
                        buffer += token
                        
                        # *** THOUGHT PHASE ***
                        if in_thought and not in_action:
                            thought_buffer += token
                            
                            if "Action:" in buffer:
                                in_thought = False
                                in_action = True
                                
                                thought_match = re.search(r"Thought:\s*(.*?)(?=Action:|$)", buffer, re.DOTALL)
                                if thought_match:
                                    final_thought = thought_match.group(1).strip()
                                    
                                    remaining = final_thought[len(thought_buffer) - len(token):]
                                    if remaining:
                                        yield f"data: {json.dumps({'type': 'thought', 'text': remaining})}\n\n"
                                
                                yield f"data: {json.dumps({'type': 'phase', 'phase': 'action'})}\n\n"
                                thought_buffer = ""
                                continue
                            
                            if "Final Answer:" in buffer:
                                final_answer_detected = True
                                
                                answer_match = re.search(r"Final Answer:\s*(.*)", buffer, re.DOTALL)
                                if answer_match:
                                    answer_text = answer_match.group(1).strip()
                                    yield f"data: {json.dumps({'type': 'done', 'answer': answer_text})}\n\n"
                                return
                            
                            
                            yield f"data: {json.dumps({'type': 'thought', 'text': token})}\n\n"
                        
                        # *** ACTION PHASE ***
                        elif in_action:
                            action_buffer += token
                            
                            action_pattern = re.search(
                                r'Action:\s*(\w+)\s*Action Input:\s*(\{[^}]*\})', 
                                buffer, 
                                re.DOTALL
                            )
                            
                            if action_pattern:
                                tool_name = action_pattern.group(1).strip()
                                params_str = action_pattern.group(2).strip()
                                
                                try:
                                    params = json.loads(params_str)
                                    action_detected = True
                                    
                                    logger.info(f"🔧 Tool: {tool_name} | Params: {params}")
                                    
                                    yield f"data: {json.dumps({'type': 'action', 'tool': tool_name, 'params': params})}\n\n"
                                    
                                    observation = execute_tool(tool_name, params)
                                    logger.info(f"📊 Observation: {observation[:150]}...")
                                    
                                    yield f"data: {json.dumps({'type': 'observation', 'text': observation})}\n\n"
                                    
                                    conversation_history.append({
                                        "role": "assistant",
                                        "content": buffer.strip()
                                    })
                                    conversation_history.append({
                                        "role": "system",
                                        "content": observation
                                    })
                                    
                                    break
                                    
                                except json.JSONDecodeError:
                                    continue
                            
                            
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to parse chunk: {chunk_json[:100]}")
                        continue
                
                if not action_detected and not final_answer_detected:
                    if "Final Answer:" in buffer:
                        answer_match = re.search(r"Final Answer:\s*(.*)", buffer, re.DOTALL)
                        if answer_match:
                            answer = answer_match.group(1).strip()
                            yield f"data: {json.dumps({'type': 'done', 'answer': answer})}\n\n"
                            return
                    
                    clean_buffer = buffer.replace("Thought:", "").strip()
                    if clean_buffer:
                        yield f"data: {json.dumps({'type': 'done', 'answer': clean_buffer})}\n\n"
                    else:
                        yield f"data: {json.dumps({'type': 'error', 'error': 'Model response incomplete'})}\n\n"
                    return
            
            logger.warning(f"⚠️ Max steps ({max_steps}) reached")
            yield f"data: {json.dumps({'type': 'done', 'answer': 'I apologize, but I reached my reasoning limit. Could you rephrase your request?'})}\n\n"
        
        except CancelledException:
            logger.info("⚠️ Generation cancelled by user")
            yield f"data: {json.dumps({'type': 'cancelled'})}\n\n"
        
        except Exception as e:
            logger.error(f"❌ Stream error: {e}", exc_info=True)
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
        "status": health.get("status", "unknown")
    }

@chat_router.get("/metrics")
async def get_metrics(llm: LLMClient = Depends(get_llm_client)):
    health = await llm.get_metrics()
    # future 
    pass