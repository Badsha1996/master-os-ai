from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
import logging
import httpx
import os
import asyncio
import json

'''
Configuration and Logging
'''
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chat")

# The URL where your Rust sidecar is listening
RUST_SIDECAR_URL = os.getenv("RUST_URL", "http://127.0.0.1:5005")

'''
Request/Response Models
'''
class ChatInput(BaseModel):
    text: str = Field(..., min_length=1, description="User's chat message")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: int = Field(default=512, ge=1, le=2048, description="Maximum tokens to generate")

class ChatResponse(BaseModel):
    response: str
    tokens_generated: int
    time_ms: int
    acceleration: str

'''
Helper Functions
'''
async def check_model_loaded() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{RUST_SIDECAR_URL}/health")
            if response.status_code == 200:
                health_data = response.json()
                return health_data.get("model_loaded", False)
    except Exception as e:
        logger.error(f"Health check failed: {e}")
    return False

async def auto_load_model() -> dict:
    try:
        logger.info("Auto-loading model...")
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{RUST_SIDECAR_URL}/load",
                json={"gpu_layers": 99}
            )
            response.raise_for_status()
            result = response.json()
            
            emoji = "🚀" if result.get("acceleration") == "GPU" else "🐢"
            logger.info(f"{emoji} Model loaded: {result.get('acceleration')}")
            return result
    except Exception as e:
        logger.error(f"Auto-load failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to load model: {str(e)}"
        )

'''
Endpoints and Router
'''

chat_router = APIRouter(prefix="/chat", tags=["Chat"])

@chat_router.post("/text-to-text", response_model=ChatResponse)
async def text_to_text(req: ChatInput):
    try:
        is_loaded = await check_model_loaded()
        if not is_loaded:
            logger.warning("⚠️ Model not loaded, auto-loading...")
            await auto_load_model()

        logger.info(f"📨 Processing chat: {req.text[:50]}...")

        prompt = (
            "<s>[INST] You are a helpful AI assistant. "
            "Answer the question fully and clearly. "
            "Do NOT stop mid-sentence.\n\n"
            f"Question: {req.text}\n"
            "Answer: [/INST]"
        )

        payload = {
            "prompt": prompt,
            "temperature": req.temperature,
            "max_tokens": req.max_tokens,
            "stop": ["</s>", "[INST]", "Question:"]
        }

       
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{RUST_SIDECAR_URL}/predict",
                json=payload
            )
            response.raise_for_status()

        data = response.json()
        
        # Get current acceleration type
        acceleration = "Unknown"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                health_response = await client.get(f"{RUST_SIDECAR_URL}/health")
                if health_response.status_code == 200:
                    health_data = health_response.json()
                    acceleration = health_data.get("acceleration", "Unknown")
        except:
            pass

        logger.info(
            f"✅ Response generated: {data.get('tokens_generated', 0)} tokens "
            f"in {data.get('time_ms', 0)}ms ({acceleration})"
        )

        return ChatResponse(
            response=data.get("text", "").strip(),
            tokens_generated=data.get("tokens_generated", 0),
            time_ms=data.get("time_ms", 0),
            acceleration=acceleration
        )

    except httpx.HTTPStatusError as e:
        logger.error(f"Rust sidecar error: {e}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Rust sidecar error: {e.response.text}"
        )
    except httpx.RequestError as e:
        logger.error(f"Connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Cannot connect to Rust sidecar: {str(e)}"
        )
    except Exception as e:
        logger.exception("Chat execution failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal error: {str(e)}"
        )


@chat_router.post("/stream")
async def text_to_text_stream(req: ChatInput):
    try:
        is_loaded = await check_model_loaded()
        if not is_loaded:
            logger.warning("⚠️ Model not loaded, auto-loading...")
            await auto_load_model()

        logger.info(f"📨 Streaming chat: {req.text[:50]}...")

        
        prompt = (
            "<s>[INST] You are a helpful AI assistant. "
            "Answer the question fully and clearly. "
            "Do NOT stop mid-sentence.\n\n"
            f"Question: {req.text}\n"
            "Answer: [/INST]"
        )
        
        payload = {
            "prompt": prompt,
            "temperature": req.temperature,
            "max_tokens": req.max_tokens,
            "stop": ["</s>", "[INST]", "Question:"]
        }

        async def generate_stream():
            try:
                async with httpx.AsyncClient(timeout=None) as client:
                    async with client.stream(
                        "POST",
                        f"{RUST_SIDECAR_URL}/predict/stream",
                        json=payload
                    ) as response:
                        response.raise_for_status()
                        
                        # Forward SSE events from Rust
                        async for line in response.aiter_lines():
                            print("***" , line)
                            if line and not line.startswith(':'):
                                yield f"{line}\n"
                                if line == "":  
                                    yield "\n"
                
            except Exception as e:
                logger.error(f"Streaming error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return StreamingResponse(
            generate_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    except Exception as e:
        logger.exception("Stream setup failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stream setup error: {str(e)}"
        )


@chat_router.get("/status")
async def chat_status():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{RUST_SIDECAR_URL}/health")
            response.raise_for_status()
            health_data = response.json()
            
        return {
            "service": "online",
            "rust_server": health_data.get("status"),
            "model_loaded": health_data.get("model_loaded"),
            "acceleration": health_data.get("acceleration"),
            "ready": health_data.get("model_loaded", False)
        }
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        return {
            "service": "online",
            "rust_server": "unavailable",
            "model_loaded": False,
            "acceleration": "None",
            "ready": False,
            "error": str(e)
        }