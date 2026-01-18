from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional
import logging
from agent.core import AgentCore, AgentError
from tools.tools import tools
from llm.llm_client import LLMClient
from utility.get_llm_client import get_llm_client

'''
Logger
'''
logger = logging.getLogger("api")

'''
Classes
'''
class AgentRequest(BaseModel):
    task: str = Field(..., min_length=1)

class LoadModelRequest(BaseModel):
    gpu_layers: int = Field(default=99, ge=0)

class MetricsResponse(BaseModel):
    total_requests: int
    total_tokens_generated: int
    total_time_ms: int
    average_tokens_per_request: float
    average_time_per_request_ms: float

class PredictRequest(BaseModel):
    prompt: str
    max_tokens: int = 1024
    temperature: float = 0.1
    stop: list[str] = Field(default_factory=lambda: ["</s>", "Step:", "User:"])

'''
Helper / utility
'''
def get_agent(llm: LLMClient = Depends(get_llm_client)) -> AgentCore:
    return AgentCore(llm, tools)

'''
End points 
'''
agent_router = APIRouter(prefix="/agent", tags=["Agent"])

@agent_router.post("/run")
async def run_agent(
    req: AgentRequest,
    agent: AgentCore = Depends(get_agent),
):
    try:
        logger.info(f"[AGENT] Task: {req.task}")
        return await agent.run(req.task)
    except AgentError as e:
        raise HTTPException(status_code=500, detail=str(e))


@agent_router.post("/llm/load")
async def load_model(
    req: LoadModelRequest,
    llm: LLMClient = Depends(get_llm_client),
):
    return await llm.load_model(req.gpu_layers)


@agent_router.post("/llm/unload")
async def unload_model(
    llm: LLMClient = Depends(get_llm_client),
):
    return await llm.unload_model()

@agent_router.get("/llm/status")
async def llm_status(
    llm: LLMClient = Depends(get_llm_client),
):
    return {
        "loaded": llm.is_loaded,
        "acceleration": llm.acceleration_type.value if llm.acceleration_type else "None",
        "gpu_layers": llm.gpu_layers,
    }

@agent_router.get("/llm/metrics", response_model=MetricsResponse)
async def get_llm_metrics(llm: LLMClient = Depends(get_llm_client)):
    try:
        metrics = await llm.get_metrics()
        return MetricsResponse(**metrics)
    except Exception as e:
        logger.error(f"[METRICS ERROR] {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve metrics: {str(e)}"
        )


@agent_router.post("/llm/predict")
async def predict_direct(
    req: PredictRequest,
    llm: LLMClient = Depends(get_llm_client),
):
    text = await llm.react(
        prompt=req.prompt,
        max_tokens=req.max_tokens,
        temperature=req.temperature,
        stop=req.stop,
        auto_load=True,
    )
    return {
        "text": text,
        "acceleration": llm.acceleration_type.value if llm.acceleration_type else "None",
    }

@agent_router.get("/health")
async def api_health(
    llm: LLMClient = Depends(get_llm_client),
):
    try:
        llm_health = await llm.health_check()
        return {
            "api": "healthy",
            "llm": llm_health,
            "ready": llm.is_loaded,
        }
    except Exception as e:
        return {
            "api": "degraded",
            "error": str(e),
            "ready": False,
        }
