import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger("agent")

class AgentError(Exception):
    pass


class AgentCore:
    def __init__(self, llm_client, tools: Dict[str, Any]):
        self.llm = llm_client
        self.tools = tools
        self.max_steps = 10   

    async def run(self, task: str) -> Dict[str, Any]:
        history: List[Dict[str, Any]] = []

        for step in range(self.max_steps):
            logger.info(f"[AGENT] Step {step + 1}")

            prompt = self._build_prompt(task, history)
            response = await self.llm.react(prompt)

            thought, action = self._parse_response(response)

            logger.info(f"[THOUGHT] {thought}")
            logger.info(f"[ACTION] {action}")

            action["name"] = self._sanitize_action_name(action["name"])

            valid_names = set(self.tools.keys()) | {"finish"}

            if action["name"] not in valid_names:
                raise AgentError(f"Invalid action name: {action['name']}")

            if action["name"] == "finish":
                return {
                    "success": True,
                    "result": action.get("input", ""),
                    "steps": history,
                }

            if action["name"] not in self.tools:
                observation = f"ERROR: Unknown tool '{action['name']}'"
            else:
                try:
                    observation = self.tools[action["name"]](action["input"])
                except Exception as e:
                    observation = f"ERROR: {str(e)}"

            history.append({
                "thought": thought,
                "action": action,
                "observation": observation,
            })

            logger.info(f"[OBSERVATION] {observation}")

            # AUTO-FINISH RULE
            if observation and isinstance(observation, str):
                if step >= 1:
                    return {
                        "success": True,
                        "result": observation,
                        "steps": history,
                    }

        raise AgentError("Max steps exceeded — agent terminated")

    def _build_prompt(self, task: str, history: List[Dict[str, Any]]) -> str:
        return (
            "You are an autonomous ReAct agent.\n\n"
            f"Task:\n{task}\n\n"
            f"Available tools:\n{list(self.tools.keys())}\n\n"
            "Rules:\n"
            "- Respond ONLY with valid JSON\n"
            "- NEVER ask the user questions\n"
            "- Use tools if needed\n"
            "- Finish immediately when the answer is known\n\n"
            f"Previous steps:\n{json.dumps(history, indent=2)}\n\n"
            "Now decide the next step."
        )

    def _parse_response(self, response: str):
        try:
            data = json.loads(response)

            thought = data.get("thought")
            if not isinstance(thought, str):
                raise ValueError("thought must be a string")

            action = data.get("action")
            if not isinstance(action, dict):
                raise ValueError("action must be an object")

            if "name" not in action:
                raise ValueError("action.name missing")

            action.setdefault("input", "")

            return thought, action

        except Exception as e:
            raise AgentError(
                f"Invalid LLM response format.\n"
                f"Raw response:\n{response}\n"
                f"Error: {e}"
            )
        
    def _sanitize_action_name(self, name: str) -> str:
        if "|" in name:
            parts = [p.strip() for p in name.split("|")]
            if "finish" in parts:
                return "finish"
            for p in parts:
                if p in self.tools:
                    return p
        return name

