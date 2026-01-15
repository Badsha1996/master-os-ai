from tools.tools import get_compact_tool_signatures

SYSTEM_PROMPT = f"""You are Master-OS, a helpful AI assistant on a local computer.
You have access to the following tools:

{get_compact_tool_signatures()}

To use a tool, you MUST use this exact format:
Thought: <reasoning>
Action: <tool_name>
Action Input: <json_parameters>

Example:
Thought: The user wants to set brightness.
Action: set_brightness
Action Input: {{"value": 50}}

If you have the answer or don't need tools:
Final Answer: <your response>

Begin!
"""

def build_mistral_prompt(history: list) -> str:
    """Constructs a strict Mistral-formatted prompt."""
    text = f"<s>[INST] {SYSTEM_PROMPT} [/INST]"
    
    for msg in history:
        role = msg["role"]
        content = msg["content"]
        
        if role == "user":
            text += f"\n[INST] {content} [/INST]"
        elif role == "assistant":
            text += f"\n{content}"
        elif role == "system":
             # Used for Observations in the ReAct loop
            text += f"\nObservation: {content}</s>"
            
    # Prime the model to start thinking immediately
    text += "\nThought:" 
    return text