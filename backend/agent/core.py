import json
import logging
from typing import Dict, Any, List

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
    def __init__(self, llm_client, tools: Dict[str, Any]):
        self.llm = llm_client
        self.tools = tools
        self.max_steps = 10  

    async def run(self, task: str) -> Dict[str, Any]:
        history: List[Dict[str, Any]] = []
        
        logger.info(f"[AGENT START] Task: {task}")

        for step in range(self.max_steps):
            logger.info(f"[STEP {step + 1}/{self.max_steps}]")

            prompt = self._build_prompt(task, history)
            
            try:
                response = await self.llm.react(prompt)
                thought, action = self._parse_response(response)
            except Exception as e:
                logger.error(f"[LLM ERROR] {e}")
                return {
                    "success": False,
                    "error": f"LLM failed: {str(e)}",
                    "steps": history,
                }

            logger.info(f"[THOUGHT] {thought}")
            logger.info(f"[ACTION] {action}")

            action["name"] = self._sanitize_action_name(action["name"])
            valid_names = set(self.tools.keys()) | {"finish"}

            if action["name"] not in valid_names:
                logger.warning(f"[INVALID ACTION] {action['name']}")
                observation = f"ERROR: Invalid action '{action['name']}'. Valid: {list(valid_names)}"
                history.append({
                    "thought": thought,
                    "action": action,
                    "observation": observation,
                })
                continue

            if action["name"] == "finish":
                logger.info(f"[FINISH] {action.get('input', '')}")
                return {
                    "success": True,
                    "result": action.get("input", ""),
                    "steps": history,
                }

            try:
                observation = self.tools[action["name"]](action["input"])
                logger.info(f"[OBSERVATION] {observation}")
            except Exception as e:
                observation = f"ERROR: Tool execution failed - {str(e)}"
                logger.error(f"[TOOL ERROR] {e}")

            history.append({
                "thought": thought,
                "action": action,
                "observation": observation,
            })

        logger.warning("[MAX STEPS] Agent terminated")
        return {
            "success": False,
            "error": "Max steps exceeded",
            "steps": history,
            "partial_result": history[-1]["observation"] if history else None
        }

    def _build_prompt(self, task: str, history: List[Dict[str, Any]]) -> str:
        """ReAct prompt - optimized for Mistral-7B"""
        tools_list = ", ".join(self.tools.keys())
        history_text = ""

        if history:
            for i, step in enumerate(history[-3:]):  
                history_text += f"\nStep {i+1}:\n"
                history_text += f"Thought: {step['thought']}\n"
                history_text += f"Action: {step['action']}\n"
                history_text += f"Observation: {step['observation']}\n"
        
        return f"""You are a ReAct agent. Complete this task step-by-step.
                    Task: {task}
                    Available tools: {tools_list}
                    Rules:
                    1. Respond ONLY with valid JSON
                    2. Use format: {{"thought": "reasoning", "action": {{"name": "tool_name", "input": "argument"}}}}
                    3. To finish, use: {{"thought": "final reasoning", "action": {{"name": "finish", "input": "final answer"}}}}
                    4. NEVER ask questions - decide and act

                    Previous steps:{history_text if history_text else " None"}

                    What's your next action? Return JSON only."""

    def _parse_response(self, response: str):
        try:
            data = json.loads(response)

            thought = data.get("thought", "")
            if not isinstance(thought, str) or not thought.strip():
                thought = "No thought provided"

            action = data.get("action", {})
            if not isinstance(action, dict):
                raise ValueError("action must be an object")

            if "name" not in action:
                raise ValueError("action.name is required")

            action.setdefault("input", "")

            return thought, action

        except Exception as e:
            raise AgentError(
                f"Invalid JSON response.\n"
                f"Response: {response[:500]}\n"
                f"Error: {e}"
            )
        
    def _sanitize_action_name(self, name: str) -> str:
        name = name.strip().lower()

        if "|" in name:
            parts = [p.strip() for p in name.split("|")]
            if "finish" in parts:
                return "finish"
            for p in parts:
                if p in self.tools:
                    return p
        
        if name in self.tools or name == "finish":
            return name
            
        for tool_name in self.tools:
            if tool_name.lower() in name or name in tool_name.lower():
                return tool_name
                
        return name

