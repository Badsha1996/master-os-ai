import json
import re
from setup import llm
from prompts.react_prompt import SYSTEM_PROMPT

class LLMClient:
    def __init__(self, llm):
        self.llm = llm

    async def react(self, prompt: str) -> str:
        output = self.llm.create_chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": (SYSTEM_PROMPT),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.0,               
            stop=["<|im_start|>", "<|im_end|>"], 
        )

        raw = output["choices"][0]["message"]["content"]
        return self._extract_json(raw)

    def _extract_json(self, text: str) -> str:
        """
        Extract the FIRST JSON object from model output.
        """
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise ValueError(f"No JSON object found:\n{text}")
        return match.group(0)

llm_client = LLMClient(llm)
