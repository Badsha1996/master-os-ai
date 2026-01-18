import os
from contextlib import asynccontextmanager
import threading
from fastapi import FastAPI, Header, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from llm.llm_client import LLMClient
from routes.file_system import file_router
from routes.chat import chat_router
from routes.agent import agent_router
import uvicorn
from dotenv import load_dotenv
import os
from utility.index_files_background import index_files_background

load_dotenv()

EXPECTED_TOKEN = os.environ.get("MASTER_TOKEN", "")
PORT = int(os.environ.get("PYTHON_PORT", "8000"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    llm = LLMClient()
    await llm.initialize(gpu_layers=99, cold_start=True)
    app.state.llm_client = llm
    thread = threading.Thread(target=index_files_background, daemon=True)
    thread.start()
    yield
    await llm.unload_model()
    await llm.close()


app = FastAPI(
    title="Master OS Worker",
    description="Python should only act as SENCES(eyes + ears + voice)",
    lifespan=lifespan,
)


def verify_token(x_token: str = Header(...)):
    if x_token != EXPECTED_TOKEN:
        raise HTTPException(status_code=403)


@app.get("/api/health")
def health(_: str = Header(..., alias="x-token")):
    verify_token(_)
    return JSONResponse(content={"status": "healthy"})


"""
All Routers 
"""
app.include_router(file_router, prefix="/api", dependencies=[Depends(verify_token)])
app.include_router(chat_router, prefix="/api", dependencies=[Depends(verify_token)])
app.include_router(agent_router, prefix="/api", dependencies=[Depends(verify_token)])

if __name__ == "__main__":
    uvicorn.run(
        app,
        host=os.environ.get("HOST", ""),
        port=PORT,
        log_level="info",
    )
