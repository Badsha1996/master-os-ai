from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import logging
from setup import MODEL_PATH
from setup import llm

'''
Logging and debugers
'''
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chat")


'''
Req and Res models
'''
class ChatInput(BaseModel):
    text: str

'''
Router and Endpoints 
'''
chat_router = APIRouter(prefix="/chat", tags=["CHAT"])

@chat_router.post("/text-to-text")
def text_to_text(req: ChatInput) -> JSONResponse:
    try:
        logger.info(f"CHAT request received: {MODEL_PATH}...") 
        output = llm(
            f"# You are MOS-AI. You can answer eveything with max precision. USER REQUEST :  {req.text} ", 
            temperature=0.3,
            stop=["Q:", "\n"], # Stop generating just before the model would generate a new question
            echo=False # Echo the prompt back in the output
        )

        final_answer = output['choices'][0]['text'] # type:ignore
        return JSONResponse(status_code=200, content={"response" : final_answer}) 

    except Exception as e:
        logger.exception("CHAT execution failed")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)},
        )
    


