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
        for i, step in enumerate(history[-3:]):
            obs = str(step.get('observation', ''))
            if len(obs) > 500:
                obs = obs[:500] + "... (truncated)"
            
            history_text += (
                f"\nStep {i+1}:\n"
                f"Thought: {step.get('thought', '')}\n"
                f"Action: {json.dumps(step.get('action', {}))}\n"
                f"Observation: {obs}\n"
            )

        return f"""You are a helpful AI assistant with access to tools.
            Task: {task}

            Available Tools:
            {tools_desc}
            - finish: Use this when you have the final answer. Put the answer in the 'input' field.

            CRITICAL RULES:
            1. For simple greetings/questions, use finish immediately with your response
            2. Use tools only when needed for specific tasks
            3. Always provide an answer in finish's input field
            4. Output ONLY valid JSON, no extra text

            JSON Format:
            {{
            "thought": "your reasoning",
            "action": {{ "name": "tool_name", "input": "value or answer" }}
            }}

            Examples:
            - For "hi": {{"thought": "User is greeting me", "action": {{"name": "finish", "input": "Hello! How can I help you today?"}}}}
            - For "2+2": {{"thought": "Need to calculate", "action": {{"name": "calculator", "input": "2+2"}}}}

            History:
            {history_text or "No previous steps."}

            Your JSON response:"""
    
    def _parse_response(self, response: str) -> Tuple[str, Dict[str, Any]]:
        try:
            data = json.loads(response)
            thought = data.get("thought", "No thought provided")
            action = data.get("action")

            if not action or not isinstance(action, dict):
                if "tool_name" in data:
                    action = {"name": data["tool_name"], "input": data.get("tool_input", "")}
                else:
                    raise ValueError("Missing 'action' object in JSON")

            if "name" not in action:
                raise ValueError("Action missing 'name' field")
            
            if "input" not in action:
                action["input"] = ""

            return thought, action

        except Exception as e:
            raise ValueError(f"Failed to parse LLM response: {e}")

    def _sanitize_action_name(self, name: str) -> str:
        name = name.strip().lower()
        if ":" in name: 
            name = name.split(":")[-1]
        return name