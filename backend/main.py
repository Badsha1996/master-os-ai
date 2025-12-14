import os
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import uvicorn

EXPECTED_TOKEN = "54321"
PORT = int(os.environ.get("PYTHON_PORT", "8000"))

class TTSRequest(BaseModel):
    text: str

class STTRequest(BaseModel):
    audio_path: str

app = FastAPI(title="Master OS Worker", 
              description="Python should only act as SENCES(eyes + ears + voice)")

def verify_token(x_token: str = Header(...)):
    if x_token != EXPECTED_TOKEN:
        raise HTTPException(status_code=403)

@app.get("/health")
def health(_: str = Header(..., alias="x-token")):
    verify_token(_)
    return {"status": "ok"}


@app.post("/stt")
def speech_to_text(req: STTRequest, _: str = Header(..., alias="x-token")):
    verify_token(_)
    return {"text": "example transcription"}


@app.post("/tts")
def text_to_speech(req: TTSRequest, _: str = Header(..., alias="x-token")):
    verify_token(_)
    return {"audio_path": "/tmp/audio.wav"}

@app.get("/test")
def test(_: str = Header(..., alias="x-token")):
    return {"tested" : ["test1", "test2"]}

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=PORT,
        log_level="info",
    )
