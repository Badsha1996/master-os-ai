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
MODEL_PATH = BASE_DIR / "models" / "mistral-7b-instruct-v0.2.Q4_K_S.gguf"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("llm")
llm_router = APIRouter(prefix="/llm", tags=["LLM"])
llm = Llama(
    model_path=str(MODEL_PATH),
    n_ctx=4096,
    n_gpu_layers=28,  # Optimal for 4GB VRAM
    n_threads=8,
    n_batch=512,
    verbose=False,
    seed=42,
    chat_format="chatml"
)

@llm_router.post("/text-to-text")
def text_to_text(req: LLMRequest) -> JSONResponse:
    try:
        logger.info(f"LLM request received: {MODEL_PATH}...") 
        # output = llm(
        #     f"# You are MOS-AI. You can answer eveything with max precision. USER REQUEST :  {req.text} ", 
        #     temperature=0.3,
        #     # stop=["Q:", "\n"], # Stop generating just before the model would generate a new question
        #     echo=False # Echo the prompt back in the output
        # )

        output = llm.create_chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant named MOS-AI that answer user's query and outputs in JSON.",
                },
                {"role": "user", "content": f"{req.text}"},
            ],
            response_format={
                "type": "json_object",
                "schema": {
                    "type": "object",
                    "properties": {"answer": {"type": "string"}},
                    "required": ["answer"],
                },
            },
            temperature=0.7,
        )
               
        raw_content = output['choices'][0]['message']['content'] #type: ignore
        content_dict = json.loads(raw_content) #type: ignore
        final_answer = content_dict['answer']
        return JSONResponse(status_code=200, content={"response" : final_answer}) 

    except Exception as e:
        logger.exception("LLM execution failed")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)},
        )
    

class LLMClient:
    def __init__(self, llm):
        self.llm = llm

    async def react(self, prompt: str) -> str:
        output = self.llm.create_chat_completion(
            messages=[
                {
                "role": "system",
                "content": (
                    "You are a ReAct agent.\n"
                    "You MUST respond in strict JSON.\n\n"
                    "FORMAT:\n"
                    "{\n"
                    '  "thought": "string",\n'
                    '  "action": {\n'
                    '    "name": "tool_name | finish",\n'
                    '    "input": "string"\n'
                    "  }\n"
                    "}\n\n"
                    "Rules:\n"
                    "- thought MUST be a string\n"
                    "- action MUST be an object\n"
                    "- NEVER return arrays\n"
                    "- NEVER return plain strings\n"
                    "- NO explanations outside JSON"
                ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )

        return output["choices"][0]["message"]["content"]

llm_client = LLMClient(llm)
