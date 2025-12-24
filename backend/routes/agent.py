from fastapi import APIRouter
from pydantic import BaseModel
from agent.core import AgentCore
from routes.llm_client import llm_client
from tools.basic import echo, add_numbers

agent_router = APIRouter(prefix="/agent", tags=["Agent"])

class AgentRequest(BaseModel):
    task: str

tools = {
    "echo": echo,
    "add_numbers": add_numbers,
}

agent = AgentCore(llm_client, tools)

@agent_router.post("/run")
async def run_agent(req: AgentRequest):
    result = await agent.run(req.task)
    return result
