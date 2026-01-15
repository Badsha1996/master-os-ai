import json
import re
import logging
import asyncio
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional

from llm.llm_client import LLMClient, CancelledException
from utility.get_llm_client import get_llm_client
from tools.tools import execute_action

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
            
            # Verify load succeeded
            health = await llm.health_check()
            if health.get("model_loaded"):
                logger.info("✅ Model loaded successfully")
                return True
                
        except Exception as e:
            logger.error(f"❌ Load attempt {attempt + 1} failed: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
            
    return False

@chat_router.post("/stream")
async def text_to_text_stream(
    req: ChatInput, 
    request: Request, 
    llm: LLMClient = Depends(get_llm_client)
):
    logger.info(f"🎯 MOS Processing: '{req.text[:60]}...'")

    async def event_generator():
        # Ensure model is loaded before streaming
        if not await ensure_model_loaded(llm):
            yield f"data: {json.dumps({'type': 'error', 'error': 'Failed to load model after multiple attempts'})}\n\n"
            return

        full_response = ""
        thinking_content = ""
        response_content = ""
        action_buffer = ""
        
        in_thinking = False
        in_action = False
        thinking_complete = False
        
        logger.info("🚀 Starting event generator")
        
        try:
            # Send initial status
            yield f"data: {json.dumps({'type': 'status', 'status': 'thinking'})}\n\n"
            
            logger.info("📡 Beginning token stream...")
            token_count = 0
            
            async for chunk_json in llm.stream(req.text, req.context):
                if await request.is_disconnected():
                    logger.warning("Client disconnected")
                    break
                
                try:
                    data = json.loads(chunk_json)
                    token = data.get("text", "")
                    
                    if not token:
                        logger.debug("Received empty token, skipping")
                        continue
                    
                    token_count += 1
                    if token_count % 10 == 0:
                        logger.info(f"Received {token_count} tokens...")
                    
                    logger.debug(f"Token received: '{token}' (full so far: {len(full_response)} chars)")
                        
                    full_response += token

                    # === THINKING BLOCK PARSING ===
                    if "<thinking>" in full_response and not in_thinking:
                        in_thinking = True
                        thinking_content = ""
                        yield f"data: {json.dumps({'type': 'phase', 'phase': 'thinking'})}\n\n"
                    
                    if in_thinking and not thinking_complete:
                        if "</thinking>" in full_response:
                            # Extract complete thinking block
                            match = re.search(r"<thinking>(.*?)</thinking>", full_response, re.DOTALL)
                            if match:
                                thinking_content = match.group(1).strip()
                                logger.info(f"📝 Thinking complete: {thinking_content[:100]}...")
                                yield f"data: {json.dumps({'type': 'thinking', 'content': thinking_content})}\n\n"
                                in_thinking = False
                                thinking_complete = True
                                yield f"data: {json.dumps({'type': 'phase', 'phase': 'responding'})}\n\n"
                        else:
                            # Stream thinking tokens in real-time
                            thinking_match = re.search(r"<thinking>(.*?)$", full_response, re.DOTALL)
                            if thinking_match:
                                current_thinking = thinking_match.group(1).strip()
                                if current_thinking != thinking_content:
                                    new_chunk = current_thinking[len(thinking_content):]
                                    thinking_content = current_thinking
                                    logger.debug(f"Thinking chunk: '{new_chunk}'")
                                    yield f"data: {json.dumps({'type': 'thinking_chunk', 'text': new_chunk})}\n\n"

                    # === ACTION BLOCK PARSING ===
                    if "<action>" in full_response and not in_action:
                        in_action = True
                        action_buffer = ""
                        yield f"data: {json.dumps({'type': 'phase', 'phase': 'executing'})}\n\n"
                    
                    if in_action:
                        if "</action>" in full_response:
                            # Extract and execute action
                            match = re.search(r"<action>(.*?)</action>", full_response, re.DOTALL)
                            if match:
                                action_json_str = match.group(1).strip()
                                try:
                                    action_data = json.loads(action_json_str)
                                    tool_name = action_data.get("tool")
                                    params = action_data.get("params", {})
                                    
                                    logger.info(f"🔧 Executing: {tool_name} with {params}")
                                    
                                    # Execute the tool
                                    result = execute_action(tool_name, params)
                                    
                                    # Send execution result
                                    yield f"data: {json.dumps({'type': 'action_result', 'tool': tool_name, 'params': params, 'result': str(result)})}\n\n"
                                    
                                except json.JSONDecodeError as e:
                                    logger.error(f"❌ Action JSON parse error: {e}")
                                    yield f"data: {json.dumps({'type': 'action_error', 'error': f'Invalid action format: {e}'})}\n\n"
                                except Exception as e:
                                    logger.error(f"❌ Action execution error: {e}")
                                    yield f"data: {json.dumps({'type': 'action_error', 'error': str(e)})}\n\n"
                                
                                in_action = False
                                action_buffer = ""

                    # === RESPONSE TEXT STREAMING ===
                    if thinking_complete:
                        # Extract clean response (no tags)
                        clean_text = full_response
                        
                        # Remove thinking block
                        clean_text = re.sub(r"<thinking>.*?</thinking>", "", clean_text, flags=re.DOTALL)
                        
                        # Remove action blocks
                        clean_text = re.sub(r"<action>.*?</action>", "", clean_text, flags=re.DOTALL)
                        
                        clean_text = clean_text.strip()
                        
                        # Stream new response content
                        if clean_text != response_content:
                            new_chunk = clean_text[len(response_content):]
                            if new_chunk:
                                response_content = clean_text
                                logger.debug(f"Response chunk: '{new_chunk}'")
                                yield f"data: {json.dumps({'type': 'response', 'text': new_chunk})}\n\n"

                except json.JSONDecodeError as e:
                    logger.error(f"❌ Chunk parse error: {e}")
                    continue
                except Exception as e:
                    logger.error(f"❌ Processing error: {e}")
                    continue

            # Send completion signal
            logger.info(f"✅ Stream completed: {token_count} tokens total")
            logger.info(f"Final response length: {len(response_content)} chars")
            yield f"data: {json.dumps({'type': 'done', 'thinking': thinking_content, 'response': response_content})}\n\n"
            logger.info("✅ Stream completed successfully")

        except CancelledException:
            logger.warning("⚠️ Generation cancelled by user")
            yield f"data: {json.dumps({'type': 'cancelled'})}\n\n"
        except Exception as e:
            logger.error(f"❌ Stream error: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
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