import os
import webbrowser
import logging
from datetime import datetime
from typing import Any, Callable, Dict, List
import traceback

# External libraries
try:
    import screen_brightness_control as sbc
    BRIGHTNESS_AVAILABLE = True
except ImportError:
    BRIGHTNESS_AVAILABLE = False
    logging.warning("screen_brightness_control not installed")

logger = logging.getLogger("mos_tools")

class ToolExecutionError(Exception):
    """Raised when a tool fails to execute."""
    pass

# ==================== TOOL DEFINITIONS ====================

class ToolRegistry:
    """Registry of all available tools with their schemas."""
    
    @staticmethod
    def set_brightness(value: int) -> str:
        """Adjust physical monitor brightness (0-100)."""
        if not BRIGHTNESS_AVAILABLE:
            return "Error: Brightness control library not available"
        
        try:
            val = max(0, min(100, int(value)))
            sbc.set_brightness(val) # type: ignore
            logger.info(f"✅ Brightness set to {val}%")
            return f"Successfully set screen brightness to {val}%"
        except Exception as e:
            logger.error(f"Brightness control failed: {e}")
            return f"Failed to adjust brightness: {str(e)}"

    @staticmethod
    def play_spotify(mood: str = "energetic") -> str:
        """Open Spotify and search for playlists matching the mood."""
        try:
            safe_mood = mood.strip().lower()[:50]
            url = f"https://open.spotify.com/search/playlist%20{safe_mood}"
            webbrowser.open(url)
            logger.info(f"✅ Opened Spotify with mood: {safe_mood}")
            return f"Opened Spotify searching for '{safe_mood}' playlists"
        except Exception as e:
            logger.error(f"Spotify open failed: {e}")
            return f"Failed to open Spotify: {str(e)}"

    @staticmethod
    def file_search(query: str) -> str:
        """Search Documents, Desktop, and Downloads for files matching the query."""
        try:
            if not query or len(query.strip()) < 2:
                return "Error: Search query too short (minimum 2 characters)"
            
            query_lower = query.lower().strip()
            results = []
            max_results = 10
            
            search_paths = [
                os.path.expanduser("~/Documents"),
                os.path.expanduser("~/Desktop"),
                os.path.expanduser("~/Downloads")
            ]
            
            for base_path in search_paths:
                if not os.path.exists(base_path):
                    continue
                
                try:
                    for root, dirs, files in os.walk(base_path):
                        dirs[:] = [d for d in dirs if not d.startswith('.')]
                        
                        for file in files:
                            if query_lower in file.lower():
                                full_path = os.path.join(root, file)
                                results.append(full_path)
                                
                                if len(results) >= max_results:
                                    break
                        
                        if len(results) >= max_results:
                            break
                except PermissionError:
                    continue
            
            if not results:
                logger.info(f"No files found for: {query}")
                return f"No files found matching '{query}'"
            
            logger.info(f"✅ Found {len(results)} files for: {query}")
            formatted = "\n".join([f"• {os.path.basename(r)} ({os.path.dirname(r)})" for r in results])
            return f"Found {len(results)} file(s):\n{formatted}"
            
        except Exception as e:
            logger.error(f"File search failed: {e}")
            return f"File search error: {str(e)}"

    @staticmethod
    def get_current_time() -> str:
        """Get current date and time."""
        try:
            now = datetime.now()
            formatted = now.strftime("%A, %B %d, %Y at %I:%M %p")
            logger.info(f"✅ Time requested: {formatted}")
            return f"Current time: {formatted}"
        except Exception as e:
            logger.error(f"Time retrieval failed: {e}")
            return f"Error getting time: {str(e)}"

    @staticmethod
    def open_app(app_name: str) -> str:
        """Open an application by name (Windows-focused)."""
        try:
            import subprocess
            
            app_map = {
                "notepad": "notepad.exe",
                "calculator": "calc.exe",
                "chrome": "chrome.exe",
                "edge": "msedge.exe",
                "firefox": "firefox.exe",
                "explorer": "explorer.exe",
                "cmd": "cmd.exe",
                "powershell": "powershell.exe",
                "vscode": "code.exe",
                "spotify": "spotify.exe",
            }
            
            app_lower = app_name.lower().strip()
            executable = app_map.get(app_lower, f"{app_lower}.exe")
            
            subprocess.Popen(executable, shell=True)
            logger.info(f"✅ Opened app: {app_name}")
            return f"Successfully opened {app_name}"
            
        except Exception as e:
            logger.error(f"Failed to open {app_name}: {e}")
            return f"Could not open {app_name}: {str(e)}"

    @staticmethod
    def open_website(url: str) -> str:
        """Open a website in the default browser."""
        try:
            if not url.startswith(("http://", "https://")):
                url = "https://" + url
            
            webbrowser.open(url)
            logger.info(f"✅ Opened URL: {url}")
            return f"Opened {url} in browser"
            
        except Exception as e:
            logger.error(f"Failed to open URL: {e}")
            return f"Could not open website: {str(e)}"

    @staticmethod
    def compose_email(to: str = "", subject: str = "", body: str = "") -> str:
        """Open default email client with pre-filled fields."""
        try:
            mailto = f"mailto:{to}?subject={subject}&body={body}"
            webbrowser.open(mailto)
            logger.info("✅ Opened email client")
            return f"Opened email client with pre-filled fields"
        except Exception as e:
            logger.error(f"Email client open failed: {e}")
            return f"Could not open email: {str(e)}"

    @staticmethod
    def get_system_info() -> str:
        """Get basic system information."""
        try:
            import platform
            info = {
                "OS": platform.system(),
                "Version": platform.version(),
                "Machine": platform.machine(),
                "Processor": platform.processor()
            }
            formatted = "\n".join([f"{k}: {v}" for k, v in info.items()])
            return f"System Information:\n{formatted}"
        except Exception as e:
            return f"Error getting system info: {str(e)}"

    @staticmethod
    def final_answer(answer: str) -> str:
        """Return final answer to user. This ends the ReAct loop."""
        return answer


# ==================== TOOL SCHEMAS FOR LLM ====================

TOOL_SCHEMAS = [
    {
        "name": "set_brightness",
        "description": "Adjust physical monitor brightness. Use when user asks to change screen brightness or mentions eye strain.",
        "parameters": {
            "value": "integer between 0-100 (e.g., 50 for 50% brightness)"
        },
        "examples": ["set brightness to 30", "dim my screen", "increase brightness"]
    },
    {
        "name": "play_spotify",
        "description": "Open Spotify and search for music matching a mood. Use when user wants to listen to music.",
        "parameters": {
            "mood": "string describing the mood (e.g., 'sad', 'energetic', 'calm', 'focus')"
        },
        "examples": ["play sad music", "I want energetic songs", "play something calm"]
    },
    {
        "name": "file_search",
        "description": "Search for files in Documents, Desktop, and Downloads. Use when user asks to find files.",
        "parameters": {
            "query": "search term to find in filenames"
        },
        "examples": ["find my essay", "where is climate change document", "search for report"]
    },
    {
        "name": "get_current_time",
        "description": "Get the current date and time. Use when user asks what time it is.",
        "parameters": {},
        "examples": ["what time is it", "current time", "what's the date"]
    },
    {
        "name": "open_app",
        "description": "Open a Windows application. Use when user wants to launch an app.",
        "parameters": {
            "app_name": "name of the app (e.g., 'notepad', 'calculator', 'chrome', 'vscode')"
        },
        "examples": ["open notepad", "launch calculator", "start chrome"]
    },
    {
        "name": "open_website",
        "description": "Open a website in the browser. Use when user wants to visit a URL.",
        "parameters": {
            "url": "website URL"
        },
        "examples": ["open google.com", "go to youtube", "visit github"]
    },
    {
        "name": "compose_email",
        "description": "Open email client with pre-filled fields. Use when user wants to write an email.",
        "parameters": {
            "to": "recipient email (optional)",
            "subject": "email subject (optional)",
            "body": "email body (optional)"
        },
        "examples": ["compose email", "write email to john@example.com"]
    },
    {
        "name": "get_system_info",
        "description": "Get system information like OS, version, processor. Use when user asks about their computer.",
        "parameters": {},
        "examples": ["what's my system info", "tell me about my computer"]
    },
    {
        "name": "final_answer",
        "description": "Return the final answer to the user. Use this when you have all the information needed to answer the user's question.",
        "parameters": {
            "answer": "the final answer to give to the user"
        },
        "examples": []
    }
]

# ==================== TOOL MAPPING ====================

TOOL_MAP: Dict[str, Callable] = {
    "set_brightness": ToolRegistry.set_brightness,
    "play_spotify": ToolRegistry.play_spotify,
    "file_search": ToolRegistry.file_search,
    "get_current_time": ToolRegistry.get_current_time,
    "open_app": ToolRegistry.open_app,
    "open_website": ToolRegistry.open_website,
    "compose_email": ToolRegistry.compose_email,
    "get_system_info": ToolRegistry.get_system_info,
    "final_answer": ToolRegistry.final_answer,
}

def execute_tool(tool_name: str, params: Dict[str, Any]) -> str:
    """
    Execute a tool and return its result.
    
    Args:
        tool_name: Name of the tool to execute
        params: Dictionary of parameters for the tool
        
    Returns:
        Result string from tool execution
    """
    if tool_name not in TOOL_MAP:
        available = ", ".join(TOOL_MAP.keys())
        logger.error(f"Unknown tool: {tool_name}")
        return f"Error: Unknown tool '{tool_name}'. Available tools: {available}"
    
    tool_func = TOOL_MAP[tool_name]
    
    try:
        logger.info(f"🔧 Executing: {tool_name} with params: {params}")
        
        if params:
            result = tool_func(**params)
        else:
            result = tool_func()
        
        logger.info(f"✅ {tool_name} completed successfully")
        return str(result)
        
    except TypeError as e:
        logger.error(f"Parameter error for {tool_name}: {e}")
        return f"Error: Invalid parameters for {tool_name}. {str(e)}"
        
    except Exception as e:
        logger.error(f"Execution failed for {tool_name}: {e}")
        logger.error(traceback.format_exc())
        return f"Execution error in {tool_name}: {str(e)}"

def get_tools_description() -> str:
    """Generate a formatted description of all available tools for the LLM."""
    desc = "You have access to the following tools:\n\n"
    for tool in TOOL_SCHEMAS:
        desc += f"Tool: {tool['name']}\n"
        desc += f"Description: {tool['description']}\n"
        desc += f"Parameters: {tool['parameters']}\n"
        if tool['examples']:
            desc += f"Examples: {', '.join(tool['examples'])}\n"
        desc += "\n"
    return desc