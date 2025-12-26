from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agent.core import AgentCore, AgentError
from tools.tools import tools
from llm.llm_client import llm_client
import logging
'''
Logging 
'''
logger = logging.getLogger("api")

'''
Req and Res models
'''
class AgentRequest(BaseModel):
    task: str

'''
Router and Endpoints 
'''
agent_router : APIRouter = APIRouter(prefix="/agent", tags=["Agent"])
agent = AgentCore(llm_client, tools)



@agent_router.post("/run")
async def run_agent(req: AgentRequest):
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