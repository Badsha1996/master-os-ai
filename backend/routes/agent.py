from fastapi import APIRouter
from pydantic import BaseModel
from agent.core import AgentCore
from tools.tools import tools
from llm.llm_client import llm_client

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
    result = await agent.run(req.task)
    return result
