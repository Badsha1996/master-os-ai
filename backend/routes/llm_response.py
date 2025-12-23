from fastapi import APIRouter
from pathlib import Path
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from llama_cpp import Llama
import json
import logging
import re

class LLMRequest(BaseModel):
    text: str

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "llama-3.2-1b-instruct-q8_0.gguf"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("llm")
llm_router = APIRouter(prefix="/llm", tags=["LLM"])


@llm_router.post("/text-to-text")
def text_to_text(req: LLMRequest) -> JSONResponse:
    try:
        logger.info(f"LLM request received: {req.text}...") 

        logger.info("LLM response successfully parsed")
        return JSONResponse(status_code=200, content={"response": "this is your response"})

    except Exception as e:
        logger.exception("LLM execution failed")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)},
        )