import re
import httpx
import os
import logging
import json
'''
Logging 
'''
logger = logging.getLogger("llm_client")

'''
Main class
'''
class LLMClient:
    def __init__(self):
        self.rust_url = os.getenv("RUST_URL", "http://127.0.0.1:5005")

    async def react(self, prompt: str, max_retries: int = 3) -> str: 
        # Format prompt for Mistral Instruct
        formatted_prompt = f"<s>[INST] {prompt} [/INST]"
        
        payload = {
            "prompt": formatted_prompt,
            "max_tokens": 245,  
            "stop": ["</s>", "[INST]", "Observation:"]
        }

        for attempt in range(max_retries):
            raw_content = "N/A"
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        f"{self.rust_url}/predict", 
                        json=payload
                    )
                    response.raise_for_status()

                    data = response.json()
                    raw_content = data.get("text", "").strip()
                    
                    logger.info(f"[LLM RAW] {raw_content}")
                    json_str = self._extract_json(raw_content)
                    json.loads(json_str)  
                    
                    return json_str
                    
            except (httpx.HTTPError, ValueError, json.JSONDecodeError) as e:
                logger.warning(f"Attempt {attempt + 1}/{max_retries} failed: {e}")
                if attempt == max_retries - 1:
                    raise ConnectionError(
                        f"Failed after {max_retries} attempts. "
                        f"Last error: {e}. "
                        f"Raw response: {raw_content}"
                    )
        
        return ""

    def _extract_json(self, text: str) -> str:
        text = re.sub(r"```json\s*", "", text)
        text = re.sub(r"```\s*", "", text)
        
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            if text.strip().startswith("{"):
                return text.strip()
            raise ValueError(f"No JSON found in: {text[:200]}...")
        
        return match.group(0)


llm_client = LLMClient()