import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Header, HTTPException, Depends
from fastapi.responses import JSONResponse
from llm.llm_client import llm_client
from routes.file_system import file_router
from routes.chat import chat_router
from routes.agent import agent_router
import uvicorn

EXPECTED_TOKEN = "54321"
PORT = int(os.environ.get("PYTHON_PORT", "8000"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    await llm_client.load_model()
    yield
    await llm_client.unload_model()


app = FastAPI(title="Master OS Worker", 
              description="Python should only act as SENCES(eyes + ears + voice)",
              lifespan=lifespan)

def verify_token(x_token: str = Header(...)):
    if x_token != EXPECTED_TOKEN:
        raise HTTPException(status_code=403)

@app.get("/api/health")
def health(_: str = Header(..., alias="x-token")):
    verify_token(_)
    return JSONResponse(content={"status": "healthy"})

'''
All Routers 
'''
app.include_router(file_router, prefix="/api", dependencies=[Depends(verify_token)])
app.include_router(chat_router, prefix="/api", dependencies=[Depends(verify_token)])
app.include_router(agent_router, prefix="/api", dependencies=[Depends(verify_token)])

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=PORT,
        log_level="info",
    )
