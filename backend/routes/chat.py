import logging
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from llm.llm_client import LLMClient
from utility.get_llm_client import get_llm_client

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
    pass