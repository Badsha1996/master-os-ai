from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import logging
import httpx  
import os

# Configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chat")

# The URL where your Rust sidecar is listening
RUST_SIDECAR_URL = os.getenv("RUST_URL", "http://127.0.0.1:5005")

class ChatInput(BaseModel):
    text: str

chat_router = APIRouter(prefix="/chat", tags=["CHAT"])

@chat_router.post("/text-to-text")
async def text_to_text(req: ChatInput) -> JSONResponse:
    try:
        logger.info(f"Forwarding CHAT request to Rust Sidecar...")

        # Prepare the prompt exactly as you did before
        prompt = (
            "You are a helpful AI assistant.\n"
            "Answer the question fully and clearly.\n"
            "Do NOT stop mid-sentence.\n\n"
            f"Question: {req.text}\n"
            "Answer:"
        )

        payload = {
            "prompt": prompt,
            "temperature": 0.0,
            "max_tokens": 512,
            "stop": ["Question:", "\n"]
        }

        # Send request to Rust
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(f"{RUST_SIDECAR_URL}/predict", json=payload)
        
        if response.status_code != 200:
            return JSONResponse(
                status_code=response.status_code, 
                content={"error": "Rust sidecar error", "details": response.text}
            )

        data = response.json()
        return JSONResponse(status_code=200, content={"response": data["text"]})

    except Exception as e:
        logger.exception("CHAT execution failed")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)},
        )