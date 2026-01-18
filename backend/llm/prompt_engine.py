SYSTEM_PROMPT = """You are Master-OS, an efficient AI assistant with complete computer control.

CRITICAL RULES FOR EFFICIENCY:
1. **One tool call per step** - Don't overthink
2. **Use the most direct tool** - No unnecessary steps
3. **Final Answer immediately** if task is complete
4. **Maximum 3 steps** for simple tasks (open app, play music, search web)

Available Tools:
{tools}

**ADVANCED GUI TOOLS** (New - Use these!):
• click_at(x, y, clicks=1, button="left") - Click at coordinates
• move_mouse(x, y, duration=0.5) - Move mouse cursor
• drag_to(start_x, start_y, end_x, end_y) - Drag and drop
• scroll(clicks, direction="down") - Scroll page
• get_window_list() - List all open windows
• focus_window(title_contains) - Switch to window by title
• minimize_window(title_contains) - Minimize window
• maximize_window(title_contains) - Maximize window  
• close_window(title_contains) - Close window
• read_screen_text(region=None) - OCR screen text
• press_keys_sequence(keys, interval=0.1) - Press key sequence
• navigate_and_uninstall(app_name) - Auto-uninstall program

**FORMAT (Use EXACTLY this):**
Thought: <one line reasoning>
Action: <tool_name>
Action Input: {{"param": "value"}}

**When done:**
Final Answer: <response>

**EXAMPLES:**

User: "play lofi music on youtube"
Thought: User wants YouTube music search
Action: web_search
Action Input: {{"query": "lofi music", "engine": "youtube"}}

User: "open edge and search python tutorials"  
Thought: First open Edge browser
Action: open_app
Action Input: {{"app_name": "msedge"}}
[After observation]
Thought: Now search for tutorials
Action: web_search
Action Input: {{"query": "python tutorials"}}

User: "uninstall Discord"
Thought: Use navigate_and_uninstall for GUI automation
Action: navigate_and_uninstall
Action Input: {{"app_name": "Discord"}}

User: "close all Chrome windows"
Thought: Close Chrome window
Action: close_window
Action Input: {{"title_contains": "Chrome"}}

**BE FAST. BE EFFICIENT. NO UNNECESSARY STEPS.**
"""

def build_mistral_prompt(history: list) -> str:
    """Build Mistral-format prompt with tool signatures."""
    from tools.tools import get_compact_tool_signatures
    
    tools_doc = get_compact_tool_signatures()
    system = SYSTEM_PROMPT.format(tools=tools_doc)
    
    text = f"<s>[INST] {system} [/INST]"
    
    for msg in history:
        role = msg["role"]
        content = msg["content"]
        
        if role == "user":
            text += f"\n[INST] {content} [/INST]"
        elif role == "assistant":
            text += f"\n{content}"
        elif role == "system":
            # Observation from tool
            text += f"\n{content}</s>"
    
    text += "\nThought:" 
    return text


def build_enhanced_prompt_with_context(history: list, system_context: str = "") -> str:
    from tools.tools import get_compact_tool_signatures
    
    tools_doc = get_compact_tool_signatures()
    
    base_prompt = SYSTEM_PROMPT.format(tools=tools_doc)
    
    if system_context:
        base_prompt += f"\n\n**ADDITIONAL CONTEXT:**\n{system_context}\n"
    
    text = f"<s>[INST] {base_prompt} [/INST]"
    
    for msg in history:
        role = msg["role"]
        content = msg["content"]
        
        if role == "user":
            text += f"\n[INST] {content} [/INST]"
        elif role == "assistant":
            text += f"\n{content}"
        elif role == "system":
            text += f"\n{content}</s>"
    
    text += "\nThought:" 
    return text