import json
import logging
from typing import Dict, Any, List, Tuple
from llm.llm_client import LLMClient

'''
Logger and logging
'''
logger = logging.getLogger("agent")

'''
Class
'''
class AgentError(Exception):
    pass

class AgentCore:
    def __init__(self, llm_client: LLMClient, tools: Dict[str, Any]):
        self.llm = llm_client
        self.tools = tools
        self.max_steps = 10

    async def run(self, task: str) -> Dict[str, Any]:
        history: List[Dict[str, Any]] = []
        logger.info(f"🚀 [START] Task: {task}")

        for step in range(self.max_steps):
            logger.info(f"🔄 [STEP {step + 1}/{self.max_steps}] Thinking...")

            prompt = self._build_prompt(task, history)

            try:
                response_str = await self.llm.react(prompt)
                thought, action = self._parse_response(response_str)
                
                logger.info(f"🧠 [THOUGHT] {thought}")
                logger.info(f"⚡ [ACTION] {action['name']}({action['input']})")

                action_name = self._sanitize_action_name(action["name"])
                
                if action_name == "finish":
                    result = action.get("input", "") or thought or "Task completed."
                    logger.info(f"✅ [DONE] {result}")
                    return {
                        "success": True,
                        "result": result,  
                        "steps": history
                    }

                if action_name not in self.tools:
                    observation = f"❌ Unknown tool: '{action_name}'. Available: {list(self.tools.keys())}"
                    logger.warning(observation)
                else:
                    tool_func = self.tools[action_name]
                    try:
                        observation = tool_func(action["input"])
                    except Exception as tool_err:
                        observation = f"Tool Execution Error: {str(tool_err)}"
                        logger.error(f"🛠️ [TOOL FAIL] {observation}")

                logger.info(f"👀 [OBSERVATION] {str(observation)[:100]}...")

            except Exception as e:
                logger.error(f"⚠️ [ERROR] {e}")
                thought = "Error occurred during execution."
                action = {"name": "error", "input": str(e)}
                observation = f"System Error: {str(e)}"

            history.append({
                "thought": thought,
                "action": action,
                "observation": observation,
            })

        logger.warning("🛑 [STOP] Max steps exceeded.")
        last_step = history[-1] if history else None
        fallback_result = last_step.get("observation", "Max steps exceeded") if last_step else "No steps completed"
        
        return {
            "success": False,
            "result": fallback_result,
            "error": "Max steps exceeded",
            "steps": history
        }
    
    def _build_prompt(self, task: str, history: List[Dict[str, Any]]) -> str:
        tools_desc = "\n".join(
            [f"- {name}: {func.__doc__ or 'No description'}" for name, func in self.tools.items()]
        )

        history_text = ""
        for i, step in enumerate(history):
            obs = str(step.get('observation', ''))
            if len(obs) > 200: obs = obs[:200] + "..."
            history_text += f"\nStep {i+1}:\nThought: {step.get('thought')}\nAction: {step.get('action', {}).get('name')}\nObservation: {obs}\n"

        return f"""You are MOS-AI-ReAct, an autonomous agent.
                TASK: {task}

                AVAILABLE TOOLS(You MUST pick only from this list):
                {tools_desc}
                - finish: Use this to deliver the FINAL answer to the user. Input: The full text of your response.

                STRATEGY:
                1. If the task is a simple greeting or a question you can answer yourself (like an essay), use the 'finish' tool immediately with the full content as input.
                2. Pick a tool ONLY from this list: {self.tools.items()}.
                3. If you need external data (weather, time, files), pick the correct tool.
                4. ALWAYS check history. If a tool already provided the result, do not call it again. Use 'finish'.
                5.If the history shows a tool succeeded (✅ Success!), you MUST use 'finish'.
                6. Output ONLY valid JSON.

                JSON FORMAT:
                {{
                    "thought": "The user wants an essay. I will write it now and use the finish tool.",
                    "action": {{ "name": "finish", "input": "Once upon a time..." }}
                }}

                HISTORY:
                {history_text or "No previous steps."}

                Your JSON response:"""

    def _parse_response(self, response: str) -> Tuple[str, Dict[str, Any]]:
        try:
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                response = json_match.group(0)

            data = json.loads(response)
            thought = data.get("thought", "Thinking...")
            action = data.get("action")

            # If LLM sends null action or empty, provide a "fake" error action 
            # so the loop continues and the LLM sees the error in History.
            if not action:
                return thought, {"name": "error", "input": "You must provide an action. If done, use 'finish'."}

            return thought, action
        except Exception as e:
            logger.error(f"Raw response that failed: {response}") 
            # Instead of crashing the whole run, return a recovery action
            return "Parsing error", {"name": "error", "input": f"Invalid JSON format: {str(e)}"}

    def _sanitize_action_name(self, name: str) -> str:
        name = name.strip().lower()
        if ":" in name: 
            name = name.split(":")[-1]
        return name