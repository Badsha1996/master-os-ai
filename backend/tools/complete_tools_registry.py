"""
Complete tool registry with all original + GUI automation tools.
This file should replace/extend your existing tools.py
"""

from tools.tools import TOOL_MAP as ORIGINAL_TOOLS
from tools.advanced_gui_tools import GUI_TOOLS

# Merge both registries
COMPLETE_TOOL_MAP = {**ORIGINAL_TOOLS, **GUI_TOOLS}

# Extended tool schemas for documentation
EXTENDED_TOOL_SCHEMAS = [
    # ============ ORIGINAL TOOLS ============
    {
        "name": "set_brightness",
        "description": "Adjust screen brightness (0-100)",
        "parameters": {"value": "integer 0-100"},
        "category": "system"
    },
    {
        "name": "set_volume",
        "description": "Set system volume (0-100)",
        "parameters": {"value": "integer 0-100"},
        "category": "system"
    },
    {
        "name": "play_spotify",
        "description": "Play music on Spotify",
        "parameters": {"query": "song/artist", "mood": "happy/sad/energetic (optional)"},
        "category": "media"
    },
    {
        "name": "open_app",
        "description": "Launch application (chrome, vscode, spotify, etc.)",
        "parameters": {"app_name": "application name"},
        "category": "apps"
    },
    {
        "name": "terminate_process",
        "description": "Kill/close running process",
        "parameters": {"process_name_or_pid": "name or PID"},
        "category": "apps"
    },
    {
        "name": "web_search",
        "description": "Search web (google/youtube/bing)",
        "parameters": {"query": "search term", "engine": "google/youtube/bing (default: google)"},
        "category": "web"
    },
    {
        "name": "open_website",
        "description": "Open URL in browser",
        "parameters": {"url": "website address"},
        "category": "web"
    },
    {
        "name": "file_search",
        "description": "Find files by name",
        "parameters": {"query": "search term"},
        "category": "files"
    },
    {
        "name": "read_file",
        "description": "Read file contents",
        "parameters": {"path": "file path"},
        "category": "files"
    },
    {
        "name": "write_file",
        "description": "Write to file",
        "parameters": {"path": "file path", "content": "text to write", "mode": "overwrite/append"},
        "category": "files"
    },
    {
        "name": "take_screenshot",
        "description": "Capture screen",
        "parameters": {"filename": "output filename (optional)"},
        "category": "gui"
    },
    {
        "name": "press_hotkey",
        "description": "Press keyboard shortcut (ctrl+c, alt+tab, etc.)",
        "parameters": {"keys": "key combination"},
        "category": "gui"
    },
    {
        "name": "type_text",
        "description": "Type text at cursor",
        "parameters": {"text": "text to type"},
        "category": "gui"
    },
    {
        "name": "get_system_info",
        "description": "Get computer specs",
        "parameters": {},
        "category": "system"
    },
    {
        "name": "get_system_vitals",
        "description": "Get CPU/RAM/Battery stats",
        "parameters": {},
        "category": "system"
    },
    {
        "name": "system_power",
        "description": "Shutdown/restart/sleep/lock",
        "parameters": {"action": "shutdown/restart/sleep/lock"},
        "category": "system"
    },
    
    # ============ NEW GUI AUTOMATION TOOLS ============
    {
        "name": "click_at",
        "description": "Click mouse at coordinates. Use for precise UI interaction.",
        "parameters": {"x": "integer", "y": "integer", "clicks": "1 or 2 (optional)", "button": "left/right (optional)"},
        "category": "gui_advanced",
        "examples": ["click_at(500, 300)", "double-click at center"]
    },
    {
        "name": "move_mouse",
        "description": "Move mouse cursor smoothly",
        "parameters": {"x": "integer", "y": "integer", "duration": "float seconds (optional)"},
        "category": "gui_advanced"
    },
    {
        "name": "drag_to",
        "description": "Drag from one point to another",
        "parameters": {"start_x": "int", "start_y": "int", "end_x": "int", "end_y": "int", "duration": "float (optional)"},
        "category": "gui_advanced"
    },
    {
        "name": "scroll",
        "description": "Scroll page up/down",
        "parameters": {"clicks": "integer (amount)", "direction": "up/down (default: down)"},
        "category": "gui_advanced",
        "examples": ["scroll down 5 times", "scroll up"]
    },
    {
        "name": "get_window_list",
        "description": "List all open windows/apps",
        "parameters": {},
        "category": "window_control",
        "examples": ["what windows are open", "list apps"]
    },
    {
        "name": "focus_window",
        "description": "Switch to/activate window by title",
        "parameters": {"title_contains": "partial window title"},
        "category": "window_control",
        "examples": ["switch to Chrome", "focus VS Code"]
    },
    {
        "name": "minimize_window",
        "description": "Minimize window",
        "parameters": {"title_contains": "partial window title"},
        "category": "window_control"
    },
    {
        "name": "maximize_window",
        "description": "Maximize window",
        "parameters": {"title_contains": "partial window title"},
        "category": "window_control"
    },
    {
        "name": "close_window",
        "description": "Close window by title",
        "parameters": {"title_contains": "partial window title"},
        "category": "window_control",
        "examples": ["close Chrome", "close Notepad"]
    },
    {
        "name": "read_screen_text",
        "description": "Use OCR to read text from screen",
        "parameters": {"region": "(left, top, width, height) optional tuple"},
        "category": "vision",
        "examples": ["what's on my screen", "read error message"]
    },
    {
        "name": "get_mouse_position",
        "description": "Get current mouse coordinates",
        "parameters": {},
        "category": "gui_advanced"
    },
    {
        "name": "get_screen_size",
        "description": "Get screen resolution",
        "parameters": {},
        "category": "gui_advanced"
    },
    {
        "name": "press_keys_sequence",
        "description": "Press multiple keys in sequence",
        "parameters": {"keys": "list of keys", "interval": "delay between keys (optional)"},
        "category": "gui_advanced",
        "examples": ["navigate menu with arrows", "type password"]
    },
    {
        "name": "navigate_and_uninstall",
        "description": "Automated GUI navigation to uninstall program (Windows only)",
        "parameters": {"app_name": "program name"},
        "category": "automation",
        "examples": ["uninstall Discord", "remove Chrome"]
    },
    {
        "name": "find_and_click",
        "description": "Find text/image on screen and click it",
        "parameters": {"text": "text or image to find", "confidence": "0.0-1.0 (optional)"},
        "category": "vision",
        "examples": ["click the OK button", "click Start menu"]
    },
    
    # Keep final_answer
    {
        "name": "final_answer",
        "description": "Return final response to user",
        "parameters": {"answer": "complete response"},
        "category": "meta"
    }
]


def execute_any_tool(tool_name: str, params: dict) -> str:
    """
    Execute any tool from the complete registry.
    This is the universal tool executor.
    """
    if tool_name not in COMPLETE_TOOL_MAP:
        available = ", ".join(COMPLETE_TOOL_MAP.keys())
        return f"❌ Unknown tool: {tool_name}. Available: {available[:200]}..."
    
    try:
        tool_func = COMPLETE_TOOL_MAP[tool_name]
        
        if params:
            return str(tool_func(**params))
        else:
            return str(tool_func())
            
    except TypeError as e:
        return f"❌ Invalid parameters for {tool_name}: {str(e)}"
    except Exception as e:
        return f"❌ Execution error: {str(e)}"


def get_tools_by_category() -> dict:
    """Group tools by category for better organization."""
    categories = {}
    
    for tool in EXTENDED_TOOL_SCHEMAS:
        category = tool.get("category", "other")
        if category not in categories:
            categories[category] = []
        categories[category].append(tool)
    
    return categories


def get_quick_reference() -> str:
    """
    Generate a quick reference guide for all tools.
    This helps the LLM understand what's available.
    """
    categories = get_tools_by_category()
    
    doc = "=== TOOL QUICK REFERENCE ===\n\n"
    
    for category, tools in sorted(categories.items()):
        doc += f"\n** {category.upper().replace('_', ' ')} **\n"
        
        for tool in tools:
            params_str = ", ".join([f"{k}" for k in tool.get("parameters", {}).keys()])
            doc += f"  • {tool['name']}({params_str})\n"
            doc += f"    → {tool['description']}\n"
    
    return doc


# Export everything
__all__ = [
    'COMPLETE_TOOL_MAP',
    'EXTENDED_TOOL_SCHEMAS',
    'execute_any_tool',
    'get_tools_by_category',
    'get_quick_reference'
]