import re
import httpx
import os

class LLMClient:
    def __init__(self):
        self.rust_url = os.getenv("RUST_URL", "http://127.0.0.1:5005")

    async def react(self, prompt: str) -> str:
        payload = {
            "prompt": prompt,
            "max_tokens": 1024,
            "temperature": 0.0,
            "stop": ["<|im_start|>", "<|im_end|>", "Observation:"]
        }

        async with httpx.AsyncClient(timeout=180.0) as client:
            try:
                response = await client.post(f"{self.rust_url}/predict", json=payload)
                response.raise_for_status()
                
                data = response.json()
                raw_content = data.get("text", "")
                
                return self._extract_json(raw_content)
                
            except httpx.HTTPError as e:
                raise ConnectionError(f"Rust sidecar unreachable: {e}")

    def _extract_json(self, text: str) -> str:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            if text.strip().startswith("{"): return text.strip()
            raise ValueError(f"No JSON object found in Rust response:\n{text}")
        return match.group(0)


llm_client = LLMClient()