import asyncio
import json
import logging
import os
import re
from typing import  Optional
import httpx

'''
Loggers 
'''
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("agent")

class AgentError(Exception):
    pass

class LLMConnectionError(Exception):
    pass

class LLMClient:
    def __init__(self, rust_url: Optional[str] = None):
        self.rust_url = rust_url or os.getenv("RUST_URL", "http://127.0.0.1:5005")
        self.headers = {"Content-Type": "application/json"}

    async def react(self, prompt: str, max_retries: int = 3) -> str:
        # Strong system instruction injected into the prompt
        formatted_prompt = (
            f"<s>[INST] You are an autonomous agent. "
            f"Respond ONLY with valid JSON. Do not write explanations.\n\n"
            f"{prompt} [/INST]"
        )

        payload = {
            "prompt": formatted_prompt,
            "max_tokens": 1024, 
            "temperature": 0.1, 
            "stop": ["</s>", "Step:", "User:"] 
        }

        for attempt in range(max_retries):
            raw_content = "N/A"
            try:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    response = await client.post(
                        f"{self.rust_url}/predict",
                        json=payload,
                        headers=self.headers
                    )
                    response.raise_for_status()
                    
                    data = response.json()
                    raw_content = data.get("text", "").strip()

                    json_str = self._extract_json(raw_content)
                    json.loads(json_str) 
                    
                    return json_str

            except (httpx.HTTPError, ValueError, json.JSONDecodeError, httpx.TimeoutException) as e:
                wait_time = (2 ** attempt)
                logger.warning(f"LLM Attempt {attempt + 1}/{max_retries} failed: {e}. Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)
                
                if attempt == max_retries - 1:
                    logger.error(f"Final LLM Failure. Raw Output: {raw_content}")
                    raise LLMConnectionError(f"Max retries reached. Error: {e}") from e

        return ""

    def _extract_json(self, text: str) -> str:
        text = re.sub(r"```json\s*", "", text)
        text = re.sub(r"```\s*", "", text)
        match = re.search(r"(\{.*\})", text, re.DOTALL)
        
        if match:
            candidate = match.group(1)
            candidate = re.sub(r",\s*\}", "}", candidate)
            return candidate.strip()
            
        return text.strip()
    
llm_client = LLMClient()