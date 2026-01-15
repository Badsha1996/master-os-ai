import asyncio
import json
import logging
import re
from typing import AsyncGenerator, List, Dict

from llm.llm_client import LLMClient
from tools.tools import execute_tool
from .prompt_engine import build_mistral_prompt

logger = logging.getLogger("master_os_agent")

class ReActAgent:
    def __init__(self, client: LLMClient):
        self.client = client
        # Regex to capture "Action: name" and "Action Input: {json}"
        self.action_pattern = re.compile(r'Action:\s*(\w+)\s*Action Input:\s*(\{.*?\})', re.DOTALL)

    async def run(self, user_query: str, chat_history: List[Dict]) -> AsyncGenerator[Dict, None]:
        """
        Executes the ReAct loop:
        1. Yields 'thoughts' as they generate.
        2. Detects 'Action', pauses generation, executes tool.
        3. Yields 'observation'.
        4. Re-prompts LLM with observation.
        5. Repeats until 'Final Answer'.
        """
        
        # 1. Setup local history for this run
        current_history = chat_history.copy()
        current_history.append({"role": "user", "content": user_query})
        
        max_steps = 5
        step = 0
        
        while step < max_steps:
            step += 1
            prompt = build_mistral_prompt(current_history)
            
            # Streaming Buffer
            buffer = "Thought:" # We primed the prompt with this, so we start buffer with it
            current_thought = ""
            
            # --- PHASE 1: GENERATION ---
            yield {"type": "phase", "phase": "thinking"}
            
            # We flag to stop if we hit an action or final answer
            stop_generation = False
            
            async for chunk_json in self.client.stream(prompt):
                try:
                    data = json.loads(chunk_json)
                    token = data.get("text", "")
                    buffer += token
                    current_thought += token
                    
                    # Yield text for UI to show typing
                    yield {"type": "thought", "text": token}

                    # CHECK: Did the model decide to ACT?
                    if "Action Input:" in buffer and "}" in buffer:
                        stop_generation = True
                        break # Stop receiving tokens, we need to execute
                        
                    # CHECK: Did the model decide to Finish?
                    if "Final Answer:" in buffer:
                        # Extract everything after "Final Answer:"
                        answer = buffer.split("Final Answer:")[-1].strip()
                        yield {"type": "done", "answer": answer}
                        return

                except Exception:
                    continue
            
            if not stop_generation and step < max_steps:
                # If we ran out of stream but didn't act or finish, force a stop or continue
                # usually implies the model stopped talking.
                pass

            # --- PHASE 2: PARSING & EXECUTION ---
            match = self.action_pattern.search(buffer)
            
            if match:
                tool_name = match.group(1).strip()
                tool_params_str = match.group(2).strip()
                
                try:
                    tool_params = json.loads(tool_params_str)
                    
                    # Inform UI
                    yield {
                        "type": "action", 
                        "tool": tool_name, 
                        "params": tool_params,
                        "phase": "action"
                    }
                    
                    # Execute Logic
                    observation = execute_tool(tool_name, tool_params)
                    
                    # Inform UI of result
                    yield {"type": "observation", "text": observation}
                    
                    # Append to History for next loop
                    # We append the Assistant's specific thought/action block
                    current_history.append({
                        "role": "assistant", 
                        "content": buffer # The full thought + action block
                    })
                    # We append the System's observation
                    current_history.append({
                        "role": "system", 
                        "content": observation 
                    })
                    
                except json.JSONDecodeError:
                    error_msg = "Failed to parse JSON parameters."
                    yield {"type": "observation", "text": error_msg}
                    current_history.append({"role": "system", "content": error_msg})
            else:
                # If no action found and no final answer, arguably the model failed or just chatted.
                # If it just chatted, we treat the whole buffer as the answer.
                if "Final Answer:" not in buffer:
                     # Fallback: treat raw text as answer if loop ends
                     yield {"type": "done", "answer": buffer.replace("Thought:", "").strip()}
                     return

        yield {"type": "done", "answer": "I reached the maximum number of steps without a final answer."}