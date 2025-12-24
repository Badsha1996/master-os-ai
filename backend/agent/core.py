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
        """
        ReAct loop: Thought → Action → Observation
        """
        history: List[Dict[str, Any]] = []

        for step in range(self.max_steps):
            logger.info(f"[AGENT] Step {step+1}")

            prompt = self._build_prompt(task, history)
            response = await self.llm.react(prompt)

            thought, action = self._parse_response(response)
            logger.info(f"[THOUGHT] {thought}")
            logger.info(f"[ACTION] {action}")

            if action["name"] == "finish":
                return {
                    "success": True,
                    "result": action.get("input", ""),
                    "steps": history,
                }

            if action["name"] not in self.tools:
                observation = f"Unknown tool: {action['name']}"
            else:
                try:
                    observation = self.tools[action["name"]](action["input"])
                except Exception as e:
                    observation = f"Tool error: {str(e)}"

            history.append({
                "thought": thought,
                "action": action,
                "observation": observation,
            })

            logger.info(f"[OBSERVATION] {observation}")

        raise AgentError("Max steps exceeded — possible infinite loop")

    def _build_prompt(self, task: str, history: List[Dict[str, Any]]) -> str:
        prompt = f"""
            You are an autonomous agent.

            Task:
            {task}

            Available tools:
            {list(self.tools.keys())}

            Rules:
            - Respond ONLY in valid JSON
            - Use observations to decide next steps
            - If an action result seems wrong, try a different approach
            - Use action "finish" when the task is complete

            Previous steps:
            {json.dumps(history, indent=2)}

            Now decide the next step.
            """
        return prompt


    def _parse_response(self, response: str):
        try:
            data = json.loads(response)

            # Validate thought
            thought = data.get("thought")
            if isinstance(thought, list):
                thought = " ".join(thought)
            if not isinstance(thought, str):
                raise ValueError("thought must be a string")

            # Validate action
            action = data.get("action")
            if not isinstance(action, dict):
                raise ValueError("action must be an object")

            if "name" not in action:
                raise ValueError("action.name missing")

            if "input" not in action:
                action["input"] = ""

            return thought, action

        except Exception as e:
            raise AgentError(
                f"Invalid LLM response format.\n"
                f"Raw response:\n{response}\n"
                f"Error: {e}"
            )
