import json
from fastapi import APIRouter, Depends
import asyncio
from pydantic import BaseModel, Field
from llm.llm_client import LLMClient, CancelledException
from utility.get_llm_client import get_llm_client
import logging
from fastapi.responses import StreamingResponse
from fastapi import Request

'''
Logging
'''
logger = logging.getLogger("chat")

'''
Classes
'''
class ChatInput(BaseModel):
    text: str = Field(..., min_length=1)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=512, ge=1, le=2048)

'''
Endpoints 
'''
chat_router = APIRouter(prefix="/chat", tags=["Chat"])

@chat_router.get("/status")
async def chat_status(
    llm: LLMClient = Depends(get_llm_client),
):
    return {
        "service": "online",
        "model_loaded": llm.is_loaded,
        "acceleration": (
            llm.acceleration_type.value
            if llm.acceleration_type
            else "None"
        ),
        "ready": llm.is_loaded,
        "active_streams": llm.active_stream_count,
    }

@chat_router.post("/stream")
async def text_to_text_stream(
    req: ChatInput,
    request: Request,
    llm: LLMClient = Depends(get_llm_client),
):
    async def event_generator():
        try:
            async for chunk in llm.stream(
                prompt=req.text,
                temperature=req.temperature,
                max_tokens=req.max_tokens
            ):
                if await request.is_disconnected():
                    logger.info("Client disconnected, stopping stream")
                    break
                
                yield f"data: {json.dumps({'text': chunk, 'type': 'chunk'})}\n\n"
            
            yield f"data: {json.dumps({'done': True, 'type': 'done'})}\n\n"

        except CancelledException:
            logger.info("Stream cancelled by user")
            yield f"data: {json.dumps({'type': 'cancelled', 'message': 'Stream cancelled'})}\n\n"
            
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield f"data: {json.dumps({'error': str(e), 'type': 'error'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@chat_router.post("/cancel")
async def master_cancel(llm: LLMClient = Depends(get_llm_client)):
    result = await llm.cancel_all()
    logger.info(f"Cancel request completed: {result}")
    return result