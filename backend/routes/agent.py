from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from agent.core import AgentCore, AgentError
from tools.tools import tools
from llm.llm_client import LLMClient, AccelerationType
import logging

'''
Logging 
'''
logger = logging.getLogger("api")

'''
Initialize LLM Client
'''
llm_client = LLMClient()

'''
Request and Response Models
'''
class AgentRequest(BaseModel):
    task: str = Field(..., min_length=1, description="Task for the agent to execute")

class LoadModelRequest(BaseModel):
    gpu_layers: int = Field(default=99, ge=0, description="Number of layers to offload to GPU (0 = CPU only)")

class PredictRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="Prompt for prediction")
    max_tokens: int = Field(default=1024, ge=1, le=4096, description="Maximum tokens to generate")
    temperature: float = Field(default=0.1, ge=0.0, le=2.0, description="Sampling temperature")
    stop: list[str] = Field(default_factory=lambda: ["</s>", "Step:", "User:"], description="Stop sequences")

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    acceleration: str

class MetricsResponse(BaseModel):
    total_requests: int
    total_tokens_generated: int
    total_time_ms: int
    average_tokens_per_request: float
    average_time_per_request_ms: float

class LoadResponse(BaseModel):
    status: str
    acceleration: str
    gpu_layers: int

'''
Router and Endpoints 
'''
agent_router: APIRouter = APIRouter(prefix="/agent", tags=["Agent"])
agent = AgentCore(llm_client, tools)

# ===== Agent Endpoints =====

@agent_router.post("/run")
async def run_agent(req: AgentRequest):
    """
    Execute an agent task using the ReAct pattern.
    
    The agent will iteratively think, act, and observe until the task is complete.
    """
    if not req.task or not req.task.strip():
        raise HTTPException(status_code=400, detail="Task cannot be empty")
    
    try:
        logger.info(f"[API] Received task: {req.task}")
        result = await agent.run(req.task)
        return result
    except AgentError as e:
        logger.error(f"[AGENT ERROR] {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"[UNEXPECTED ERROR] {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


# ===== LLM Management Endpoints =====

@agent_router.post("/llm/load", response_model=LoadResponse)
async def load_llm_model(req: LoadModelRequest = LoadModelRequest()):
    """
    Load the LLM model into memory.
    
    - **gpu_layers**: Number of layers to offload to GPU (99 = all layers, 0 = CPU only)
    
    Returns acceleration type (GPU/CPU) and load status.
    """
    try:
        logger.info(f"[API] Loading model with {req.gpu_layers} GPU layers...")
        result = await llm_client.load_model(gpu_layers=req.gpu_layers)
        
        # Emoji for UI toaster
        emoji = "🚀" if result["acceleration"] == "GPU" else "🐢"
        logger.info(f"[API] {emoji} Model loaded: {result['acceleration']}")
        
        return LoadResponse(**result)
    except Exception as e:
        logger.error(f"[LLM LOAD ERROR] {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load model: {str(e)}"
        )


@agent_router.post("/llm/unload")
async def unload_llm_model():
    """
    Unload the LLM model from memory to free resources.
    
    Returns unload status.
    """
    try:
        logger.info("[API] Unloading model...")
        result = await llm_client.unload_model()
        logger.info("[API] ✅ Model unloaded successfully")
        return result
    except Exception as e:
        logger.error(f"[LLM UNLOAD ERROR] {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unload model: {str(e)}"
        )


@agent_router.get("/llm/health", response_model=HealthResponse)
async def check_llm_health():
    """
    Check LLM server health and model status.
    
    Returns:
    - Server status (healthy/unhealthy)
    - Whether model is loaded
    - Acceleration type (GPU/CPU/None)
    """
    try:
        health = await llm_client.health_check()
        return HealthResponse(**health)
    except Exception as e:
        logger.error(f"[HEALTH CHECK ERROR] {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"LLM server unavailable: {str(e)}"
        )


@agent_router.get("/llm/metrics", response_model=MetricsResponse)
async def get_llm_metrics():
    """
    Get LLM usage metrics and statistics.
    
    Returns:
    - Total requests processed
    - Total tokens generated
    - Total time spent (ms)
    - Average tokens per request
    - Average time per request (ms)
    """
    try:
        metrics = await llm_client.get_metrics()
        return MetricsResponse(**metrics)
    except Exception as e:
        logger.error(f"[METRICS ERROR] {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve metrics: {str(e)}"
        )


@agent_router.get("/llm/status")
async def get_llm_status():
    """
    Get current LLM client status (local state).
    
    Returns:
    - Whether model is loaded (client-side tracking)
    - Acceleration type
    - GPU layers count
    """
    return {
        "is_loaded": llm_client.is_loaded,
        "acceleration": llm_client.acceleration_type.value if llm_client.acceleration_type else "None",
        "gpu_layers": llm_client.gpu_layers
    }


@agent_router.post("/llm/predict")
async def predict_direct(req: PredictRequest):
    """
    Direct prediction endpoint (bypasses agent logic).
    
    Useful for testing the LLM without agent reasoning.
    """
    try:
        logger.info(f"[API] Direct prediction request: {req.prompt[:50]}...")
        
        response = await llm_client.react(
            prompt=req.prompt,
            max_tokens=req.max_tokens,
            temperature=req.temperature,
            stop=req.stop,
            auto_load=True  # Auto-load if not loaded
        )
        
        return {
            "text": response,
            "acceleration": llm_client.acceleration_type.value if llm_client.acceleration_type else "None"
        }
    except Exception as e:
        logger.error(f"[PREDICTION ERROR] {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failed: {str(e)}"
        )


# ===== Initialization Endpoint =====

@agent_router.post("/llm/initialize")
async def initialize_llm(
    gpu_layers: int = 99,
    cold_start: bool = True
):
    """
    Initialize the LLM client.
    
    - **gpu_layers**: Number of GPU layers to use
    - **cold_start**: If True, loads model immediately. If False, defers to first use.
    
    This is useful for app startup to control initialization behavior.
    """
    try:
        logger.info(f"[API] Initializing LLM (cold_start={cold_start}, gpu_layers={gpu_layers})...")
        result = await llm_client.initialize(gpu_layers=gpu_layers, cold_start=cold_start)
        
        if result["status"] == "already_loaded":
            logger.info(f"[API] ℹ️ Model already loaded ({result['acceleration']})")
        elif result["status"] == "deferred":
            logger.info("[API] ⏳ Initialization deferred to first use")
        else:
            emoji = "🚀" if result["acceleration"] == "GPU" else "🐢"
            logger.info(f"[API] {emoji} Initialized with {result['acceleration']}")
        
        return result
    except Exception as e:
        logger.error(f"[INITIALIZATION ERROR] {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Initialization failed: {str(e)}"
        )


@agent_router.get("/health")
async def api_health():
    try:
        llm_health = await llm_client.health_check()
        return {
            "api_status": "healthy",
            "llm_server": llm_health,
            "agent_ready": llm_client.is_loaded
        }
    except Exception as e:
        return {
            "api_status": "degraded",
            "llm_server": {"status": "unavailable", "error": str(e)},
            "agent_ready": False
        }