import os
import webbrowser
import logging
from datetime import datetime
from typing import Any, Callable, Dict
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

class ActionRegistry:
    """Centralized registry for all Master-OS capabilities with error handling."""
    
    @staticmethod
    def set_brightness(value: int) -> str:
        """Adjust physical monitor brightness (0-100)."""
        if not BRIGHTNESS_AVAILABLE:
            return "Error: Brightness control library not available"
        
        try:
            # Clamp value to valid range
            val = max(0, min(100, int(value)))
            sbc.set_brightness(val) #type:ignore
            logger.info(f"✅ Brightness set to {val}%")
            return f"Screen brightness adjusted to {val}%"
        except ValueError as e:
            logger.error(f"Invalid brightness value: {e}")
            return f"Error: Invalid brightness value. Must be 0-100."
        except Exception as e:
            logger.error(f"Brightness control failed: {e}")
            return f"Failed to adjust brightness: {str(e)}"

    @staticmethod
    def play_spotify(mood: str = "energetic") -> str:
        """Open Spotify and search for playlists matching the mood."""
        try:
            # Sanitize mood input
            safe_mood = mood.strip().lower()[:50]  # Limit length
            url = f"https://open.spotify.com/search/playlist%20{safe_mood}"
            webbrowser.open(url)
            logger.info(f"✅ Opened Spotify with mood: {safe_mood}")
            return f"Opened Spotify searching for '{safe_mood}' playlists"
        except Exception as e:
            logger.error(f"Spotify open failed: {e}")
            return f"Failed to open Spotify: {str(e)}"

    @staticmethod
    def file_search(query: str) -> str:
        """Search Documents and Desktop for files matching the query."""
        try:
            if not query or len(query.strip()) < 2:
                return "Error: Search query too short (minimum 2 characters)"
            
            query_lower = query.lower().strip()
            results = []
            max_results = 10
            
            # Define search locations
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
                        # Skip hidden directories
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
            formatted = "\n".join([f"• {os.path.basename(r)}" for r in results])
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
                "explorer": "explorer.exe",
                "cmd": "cmd.exe",
                "powershell": "powershell.exe",
            }
            
            app_lower = app_name.lower().strip()
            executable = app_map.get(app_lower, f"{app_lower}.exe")
            
            subprocess.Popen(executable, shell=True)
            logger.info(f"✅ Opened app: {app_name}")
            return f"Opened {app_name}"
            
        except Exception as e:
            logger.error(f"Failed to open {app_name}: {e}")
            return f"Could not open {app_name}: {str(e)}"

    @staticmethod
    def open_website(url: str) -> str:
        """Open a website in the default browser."""
        try:
            # Basic URL validation
            if not url.startswith(("http://", "https://")):
                url = "https://" + url
            
            webbrowser.open(url)
            logger.info(f"✅ Opened URL: {url}")
            return f"Opened {url}"
            
        except Exception as e:
            logger.error(f"Failed to open URL: {e}")
            return f"Could not open website: {str(e)}"

    @staticmethod
    def compose_email() -> str:
        """Open default email client."""
        try:
            webbrowser.open("mailto:")
            logger.info("✅ Opened email client")
            return "Opened email client"
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


# ==================== TOOL REGISTRY ====================

TOOL_MAP: Dict[str, Callable] = {
    "set_brightness": ActionRegistry.set_brightness,
    "spotify": ActionRegistry.play_spotify,
    "files": ActionRegistry.file_search,
    "get_time": ActionRegistry.get_current_time,
    "open_app": ActionRegistry.open_app,
    "open_website": ActionRegistry.open_website,
    "compose_email": ActionRegistry.compose_email,
    "system_info": ActionRegistry.get_system_info,
}

def execute_action(tool_name: str, params: Dict[str, Any]) -> str:
    """
    Central dispatcher for all tool executions.
    
    Args:
        tool_name: Name of the tool to execute
        params: Dictionary of parameters for the tool
        
    Returns:
        Result string from tool execution
    """
    # Validate tool exists
    if tool_name not in TOOL_MAP:
        available = ", ".join(TOOL_MAP.keys())
        logger.error(f"Unknown tool: {tool_name}")
        return f"Error: Unknown tool '{tool_name}'. Available: {available}"
    
    # Get tool function
    tool_func = TOOL_MAP[tool_name]
    
    try:
        logger.info(f"🔧 Executing: {tool_name} with params: {params}")
        
        # Execute with params if provided, otherwise no args
        if params:
            result = tool_func(**params)
        else:
            result = tool_func()
        
        logger.info(f"✅ {tool_name} completed successfully")
        return str(result)
        
    except TypeError as e:
        # Parameter mismatch
        logger.error(f"Parameter error for {tool_name}: {e}")
        return f"Error: Invalid parameters for {tool_name}. {str(e)}"
        
    except Exception as e:
        # General execution error
        logger.error(f"Execution failed for {tool_name}: {e}")
        logger.error(traceback.format_exc())
        return f"Execution error in {tool_name}: {str(e)}"

def get_available_tools() -> list[str]:
    """Get list of all available tools."""
    return list(TOOL_MAP.keys())

def get_tool_info() -> Dict[str, str]:
    """Get information about all available tools."""
    return {
        name: func.__doc__ or "No description available"
        for name, func in TOOL_MAP.items()
    }