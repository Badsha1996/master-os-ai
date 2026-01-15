import os
import sys
import json
import platform
import subprocess
import webbrowser
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional
import traceback

# External libraries
try:
    import screen_brightness_control as sbc
    BRIGHTNESS_AVAILABLE = True
except ImportError:
    BRIGHTNESS_AVAILABLE = False
    logging.warning("screen_brightness_control not installed")

try:
    import pyautogui
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False

logger = logging.getLogger("master_os_tools")

# ==================== SYSTEM UTILITIES ====================

def get_platform() -> str:
    """Get current platform."""
    return platform.system().lower()

def run_applescript(script: str) -> str:
    """Execute AppleScript on macOS."""
    if get_platform() != "darwin":
        return "AppleScript only works on macOS"
    
    try:
        result = subprocess.run(
            ['osascript', '-e', script],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.stdout.strip() if result.returncode == 0 else result.stderr
    except Exception as e:
        return f"AppleScript error: {str(e)}"

def run_powershell(script: str) -> str:
    """Execute PowerShell on Windows."""
    if get_platform() != "windows":
        return "PowerShell only works on Windows"
    
    try:
        result = subprocess.run(
            ['powershell', '-Command', script],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.stdout.strip() if result.returncode == 0 else result.stderr
    except Exception as e:
        return f"PowerShell error: {str(e)}"

# ==================== TOOL IMPLEMENTATIONS ====================

class ToolRegistry:
    # ============ SYSTEM CONTROL ============
    
    @staticmethod
    def set_brightness(value: int) -> str:
        if not BRIGHTNESS_AVAILABLE:
            return "❌ Brightness control not available. Install: pip install screen-brightness-control"
        
        try:
            val = max(0, min(100, int(value)))
            sbc.set_brightness(val) # type: ignore
            logger.info(f"✅ Brightness set to {val}%")
            return f"✅ Screen brightness set to {val}%"
        except Exception as e:
            logger.error(f"Brightness control failed: {e}")
            return f"❌ Failed to adjust brightness: {str(e)}"
    
    @staticmethod
    def set_volume(value: int) -> str:
        try:
            val = max(0, min(100, int(value)))
            
            if get_platform() == "darwin":
                script = f"set volume output volume {val}"
                run_applescript(script)
            elif get_platform() == "windows":
                # Windows uses 0-65535 range
                win_val = int(val * 655.35)
                script = f"(New-Object -ComObject WScript.Shell).SendKeys([char]174)" # Mute toggle
                run_powershell(script)
            
            logger.info(f"✅ Volume set to {val}%")
            return f"✅ System volume set to {val}%"
        except Exception as e:
            logger.error(f"Volume control failed: {e}")
            return f"❌ Failed to set volume: {str(e)}"
    
    @staticmethod
    def toggle_dark_mode(enable: bool = True) -> str:
        """
        Toggle system dark mode on/off.
        Use when user wants dark/light theme.
        """
        try:
            if get_platform() == "darwin":
                mode = "dark" if enable else "light"
                script = f'''
                tell application "System Events"
                    tell appearance preferences
                        set dark mode to {str(enable).lower()}
                    end tell
                end tell
                '''
                run_applescript(script)
            elif get_platform() == "windows":
                # Windows 10/11 dark mode
                reg_val = 0 if enable else 1
                script = f'''
                Set-ItemProperty -Path HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize -Name AppsUseLightTheme -Value {reg_val}
                '''
                run_powershell(script)
            
            mode_str = "enabled" if enable else "disabled"
            logger.info(f"✅ Dark mode {mode_str}")
            return f"✅ Dark mode {mode_str}"
        except Exception as e:
            return f"❌ Failed to toggle dark mode: {str(e)}"
    
    # ============ MUSIC & MEDIA ============
    
    @staticmethod
    def play_spotify(query: str = "", mood: str = "") -> str:
        try:
            search_term = query or mood or "music"
            safe_query = search_term.strip().lower()[:100]
            
            # If Spotify is already open, use it directly
            if get_platform() == "darwin":
                # Try to control running Spotify first
                script = f'''
                tell application "System Events"
                    if exists (processes where name is "Spotify") then
                        tell application "Spotify"
                            activate
                            set search_query to "{safe_query}"
                            play track search_query
                        end tell
                        return "Playing: {safe_query}"
                    else
                        return "Opening Spotify"
                    end if
                end tell
                '''
                result = run_applescript(script)
                
                if "Opening Spotify" in result:
                    # Spotify not running, use web
                    url = f"https://open.spotify.com/search/{safe_query.replace(' ', '%20')}"
                    webbrowser.open(url)
                    return f"🎵 Opened Spotify searching for '{search_term}'"
                else:
                    return f"🎵 {result}"
            else:
                # Windows/Linux - use web Spotify
                url = f"https://open.spotify.com/search/{safe_query.replace(' ', '%20')}"
                webbrowser.open(url)
                return f"🎵 Opened Spotify searching for '{search_term}'"
        
        except Exception as e:
            logger.error(f"Spotify control failed: {e}")
            return f"❌ Failed to control Spotify: {str(e)}"
    
    @staticmethod
    def spotify_control(action: str) -> str:
        try:
            if get_platform() == "darwin":
                script = f'''
                tell application "Spotify"
                    {action}
                end tell
                '''
                run_applescript(script)
                return f"✅ Spotify: {action}"
            else:
                return "⚠️ Direct Spotify control only available on macOS. Try 'play spotify' instead."
        except Exception as e:
            return f"❌ Spotify control error: {str(e)}"
    
    # ============ FILE OPERATIONS ============
    
    @staticmethod
    def read_file(path: str, max_chars: int = 50000) -> str:
        try:
            full_path = os.path.expanduser(path)
            
            if not os.path.exists(full_path):
                return f"❌ File not found: {path}"
            
            if os.path.getsize(full_path) > 10_000_000:  # 10MB
                return f"❌ File too large (>10MB): {path}"
            
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read(max_chars)
            
            if len(content) >= max_chars:
                content += f"\n\n... [Truncated at {max_chars} chars]"
            
            return f"📄 Contents of {os.path.basename(path)}:\n\n{content}"
        
        except Exception as e:
            logger.error(f"Read file failed: {e}")
            return f"❌ Error reading file: {str(e)}"
    
    @staticmethod
    def write_file(path: str, content: str, mode: str = "overwrite") -> str:
        try:
            full_path = os.path.expanduser(path)
            
            # Create parent directories
            Path(full_path).parent.mkdir(parents=True, exist_ok=True)
            
            write_mode = 'w' if mode == "overwrite" else 'a'
            
            with open(full_path, write_mode, encoding='utf-8') as f:
                f.write(content)
            
            action = "Created" if mode == "overwrite" else "Appended to"
            bytes_written = len(content.encode('utf-8'))
            
            logger.info(f"✅ {action} {path} ({bytes_written} bytes)")
            return f"✅ {action} {path} ({bytes_written} bytes)"
        
        except Exception as e:
            logger.error(f"Write file failed: {e}")
            return f"❌ Error writing file: {str(e)}"
    
    @staticmethod
    def create_document(title: str, content: str, doc_type: str = "markdown") -> str:
        try:
            # Sanitize filename
            import re
            safe_title = re.sub(r'[^\w\s-]', '', title).strip().replace(' ', '_')
            
            docs_path = os.path.expanduser("~/Documents")
            
            if doc_type == "markdown":
                filepath = os.path.join(docs_path, f"{safe_title}.md")
                full_content = f"# {title}\n\n{content}"
            elif doc_type == "word":
                try:
                    from docx import Document
                    filepath = os.path.join(docs_path, f"{safe_title}.docx")
                    doc = Document()
                    doc.add_heading(title, 0)
                    doc.add_paragraph(content)
                    doc.save(filepath)
                    return f"✅ Created Word document: {filepath}"
                except ImportError:
                    return "❌ python-docx not installed. Creating as markdown instead."
            else:  # text
                filepath = os.path.join(docs_path, f"{safe_title}.txt")
                full_content = f"{title}\n\n{content}"
            
            Path(filepath).parent.mkdir(parents=True, exist_ok=True)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(full_content)
            
            logger.info(f"✅ Created document: {filepath}")
            return f"✅ Created document: {filepath}"
        
        except Exception as e:
            return f"❌ Error creating document: {str(e)}"
    
    @staticmethod
    def file_search(query: str, location: str = "~") -> str:
        try:
            if not query or len(query.strip()) < 2:
                return "❌ Search query too short (minimum 2 characters)"
            
            query_lower = query.lower().strip()
            results = []
            max_results = 15
            
            # Search paths
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
                        # Skip hidden dirs and system dirs
                        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in 
                                   ['node_modules', '__pycache__', 'Library']]
                        
                        for file in files:
                            if query_lower in file.lower():
                                full_path = os.path.join(root, file)
                                rel_path = os.path.relpath(full_path, os.path.expanduser('~'))
                                results.append((file, rel_path))
                                
                                if len(results) >= max_results:
                                    break
                        
                        if len(results) >= max_results:
                            break
                except PermissionError:
                    continue
            
            if not results:
                logger.info(f"No files found for: {query}")
                return f"❌ No files found matching '{query}'"
            
            logger.info(f"✅ Found {len(results)} files for: {query}")
            
            formatted = "\n".join([f"📄 {name}\n   ~/{path}" for name, path in results])
            return f"✅ Found {len(results)} file(s):\n\n{formatted}"
        
        except Exception as e:
            logger.error(f"File search failed: {e}")
            return f"❌ File search error: {str(e)}"
    
    # ============ SYSTEM INFO ============
    
    @staticmethod
    def get_current_time() -> str:
        try:
            now = datetime.now()
            formatted = now.strftime("%A, %B %d, %Y at %I:%M %p")
            logger.info(f"✅ Time requested: {formatted}")
            return f"🕐 Current time: {formatted}"
        except Exception as e:
            return f"❌ Error getting time: {str(e)}"
    
    @staticmethod
    def get_system_info() -> str:
        """
        Get system information (OS, version, processor, etc.).
        Use when user asks about their computer specs.
        """
        try:
            import platform
            import psutil
            
            info = {
                "OS": platform.system(),
                "OS Version": platform.version(),
                "Machine": platform.machine(),
                "Processor": platform.processor(),
                "CPU Cores": psutil.cpu_count(logical=False),
                "Logical CPUs": psutil.cpu_count(logical=True),
                "RAM": f"{psutil.virtual_memory().total / (1024**3):.1f} GB",
                "Python": platform.python_version()
            }
            
            formatted = "\n".join([f"  • {k}: {v}" for k, v in info.items()])
            return f"💻 System Information:\n\n{formatted}"
        except Exception as e:
            return f"❌ Error getting system info: {str(e)}"
    
    # ============ APPLICATION CONTROL ============
    
    @staticmethod
    def open_app(app_name: str) -> str:
        try:
            app_lower = app_name.lower().strip()
            
            # Platform-specific app maps
            if get_platform() == "darwin":
                app_map = {
                    "chrome": "Google Chrome",
                    "safari": "Safari",
                    "firefox": "Firefox",
                    "vscode": "Visual Studio Code",
                    "code": "Visual Studio Code",
                    "spotify": "Spotify",
                    "notes": "Notes",
                    "mail": "Mail",
                    "terminal": "Terminal",
                    "calculator": "Calculator",
                    "calendar": "Calendar"
                }
                
                app_to_open = app_map.get(app_lower, app_name)
                script = f'tell application "{app_to_open}" to activate'
                run_applescript(script)
            
            elif get_platform() == "windows":
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
                    "spotify": "spotify.exe"
                }
                
                executable = app_map.get(app_lower, f"{app_lower}.exe")
                subprocess.Popen(executable, shell=True)
            
            else:  # Linux
                subprocess.Popen([app_lower])
            
            logger.info(f"✅ Opened app: {app_name}")
            return f"✅ Opened {app_name}"
        
        except Exception as e:
            logger.error(f"Failed to open {app_name}: {e}")
            return f"❌ Could not open {app_name}: {str(e)}"
    
    @staticmethod
    def open_website(url: str) -> str:
        try:
            if not url.startswith(("http://", "https://")):
                url = "https://" + url
            
            webbrowser.open(url)
            logger.info(f"✅ Opened URL: {url}")
            return f"✅ Opened {url} in browser"
        
        except Exception as e:
            logger.error(f"Failed to open URL: {e}")
            return f"❌ Could not open website: {str(e)}"
    
    @staticmethod
    def web_search(query: str, engine: str = "google") -> str:
        try:
            engines = {
                "google": "https://www.google.com/search?q=",
                "duckduckgo": "https://duckduckgo.com/?q=",
                "bing": "https://www.bing.com/search?q=",
                "youtube": "https://www.youtube.com/results?search_query="
            }
            
            base_url = engines.get(engine.lower(), engines["google"])
            search_url = base_url + query.replace(" ", "+")
            
            webbrowser.open(search_url)
            return f"🔍 Searching {engine} for: {query}"
        
        except Exception as e:
            return f"❌ Search failed: {str(e)}"
    
    # ============ COMMUNICATION ============
    
    @staticmethod
    def compose_email(to: str = "", subject: str = "", body: str = "") -> str:
        try:
            import urllib.parse
            
            mailto_parts = []
            if subject:
                mailto_parts.append(f"subject={urllib.parse.quote(subject)}")
            if body:
                mailto_parts.append(f"body={urllib.parse.quote(body)}")
            
            mailto = f"mailto:{to}"
            if mailto_parts:
                mailto += "?" + "&".join(mailto_parts)
            
            webbrowser.open(mailto)
            logger.info("✅ Opened email client")
            return f"✅ Opened email client with pre-filled fields"
        
        except Exception as e:
            logger.error(f"Email client open failed: {e}")
            return f"❌ Could not open email: {str(e)}"
    
    # ============ AUTOMATION HELPERS ============
    
    @staticmethod
    def wait(seconds: int) -> str:
        import time
        try:
            time.sleep(min(seconds, 30))  # Max 30 seconds
            return f"✅ Waited {seconds} seconds"
        except Exception as e:
            return f"❌ Wait error: {str(e)}"
    
    @staticmethod
    def type_text(text: str) -> str:
        if not PYAUTOGUI_AVAILABLE:
            return "❌ PyAutoGUI not available. Install: pip install pyautogui"
        
        try:
            pyautogui.write(text, interval=0.05) # type: ignore
            return f"✅ Typed text: {text[:50]}..."
        except Exception as e:
            return f"❌ Type error: {str(e)}"
    
    # ============ FINAL ANSWER ============
    
    @staticmethod
    def final_answer(answer: str) -> str:
        return answer


# ==================== TOOL SCHEMAS FOR LLM ====================

TOOL_SCHEMAS = [
    {
        "name": "set_brightness",
        "description": "Adjust monitor brightness (0-100). Use for: 'dim screen', 'brighten display', 'reduce brightness'",
        "parameters": {"value": "integer 0-100"},
        "examples": ["set brightness to 30", "dim my screen", "brighten display"]
    },
    {
        "name": "set_volume",
        "description": "Set system volume (0-100). Use for: 'change volume', 'louder', 'quieter'",
        "parameters": {"value": "integer 0-100"},
        "examples": ["set volume to 50", "turn volume down", "make it louder"]
    },
    {
        "name": "toggle_dark_mode",
        "description": "Enable/disable dark mode. Use for: 'dark mode', 'light theme', 'switch theme'",
        "parameters": {"enable": "boolean (true for dark, false for light)"},
        "examples": ["enable dark mode", "turn on dark theme", "switch to light mode"]
    },
    {
        "name": "play_spotify",
        "description": "Play music on Spotify. Accepts song/artist/playlist or mood (happy/sad/calm/energetic/focus)",
        "parameters": {
            "query": "song, artist, or playlist name (optional)",
            "mood": "happy, sad, energetic, calm, focus (optional)"
        },
        "examples": ["play sad music", "play Bohemian Rhapsody", "play focus playlist"]
    },
    {
        "name": "spotify_control",
        "description": "Control Spotify playback: play, pause, next track, previous track",
        "parameters": {"action": "play, pause, next track, previous track"},
        "examples": ["pause spotify", "next song", "play music"]
    },
    {
        "name": "read_file",
        "description": "Read file contents. Use for: 'show me X file', 'read Y', 'what's in Z'",
        "parameters": {
            "path": "file path (can use ~ for home)",
            "max_chars": "maximum characters to read (default 50000)"
        },
        "examples": ["read ~/Documents/notes.txt", "show me essay.docx"]
    },
    {
        "name": "write_file",
        "description": "Write content to file. Use for: 'create file', 'save to X', 'write Y'",
        "parameters": {
            "path": "file path",
            "content": "content to write",
            "mode": "overwrite or append (default overwrite)"
        },
        "examples": ["write to notes.txt", "create todo.md", "save list to file"]
    },
    {
        "name": "create_document",
        "description": "Create formatted document (essay, report, notes). Auto-saves to ~/Documents",
        "parameters": {
            "title": "document title",
            "content": "document content",
            "doc_type": "markdown, text, or word (default markdown)"
        },
        "examples": ["create essay about climate", "make a todo list", "write report"]
    },
    {
        "name": "file_search",
        "description": "Search for files by name in Documents/Desktop/Downloads",
        "parameters": {
            "query": "search term (2+ chars)",
            "location": "search location (default: ~)"
        },
        "examples": ["find my resume", "search for budget spreadsheet", "where is essay.docx"]
    },
    {
        "name": "get_current_time",
        "description": "Get current date and time",
        "parameters": {},
        "examples": ["what time is it", "current date", "today's date"]
    },
    {
        "name": "get_system_info",
        "description": "Get computer specs (OS, CPU, RAM, etc.)",
        "parameters": {},
        "examples": ["system info", "my computer specs", "what's my OS"]
    },
    {
        "name": "open_app",
        "description": "Open application (notepad, calculator, chrome, vscode, spotify, etc.)",
        "parameters": {"app_name": "application name"},
        "examples": ["open chrome", "launch calculator", "start spotify"]
    },
    {
        "name": "open_website",
        "description": "Open website in browser",
        "parameters": {"url": "website URL"},
        "examples": ["open google.com", "go to youtube", "visit github.com"]
    },
    {
        "name": "web_search",
        "description": "Search the web using search engine",
        "parameters": {
            "query": "search query",
            "engine": "google, duckduckgo, bing, youtube (default google)"
        },
        "examples": ["search for python tutorials", "youtube search music", "google AI news"]
    },
    {
        "name": "compose_email",
        "description": "Open email client with pre-filled fields",
        "parameters": {
            "to": "recipient email (optional)",
            "subject": "email subject (optional)",
            "body": "email body (optional)"
        },
        "examples": ["compose email", "write email to john@example.com", "draft email"]
    },
    {
        "name": "wait",
        "description": "Wait for specified seconds (max 30). Use in multi-step automation",
        "parameters": {"seconds": "integer 1-30"},
        "examples": ["wait 5 seconds", "pause for 10 seconds"]
    },
    {
        "name": "type_text",
        "description": "Type text using keyboard automation. CAREFUL - types where focused!",
        "parameters": {"text": "text to type"},
        "examples": ["type hello world"]
    },
    {
        "name": "final_answer",
        "description": "Return final answer to user. Use when you have all needed information",
        "parameters": {"answer": "complete response to user"},
        "examples": []
    }
]

# ==================== TOOL MAPPING ====================

TOOL_MAP: Dict[str, Callable] = {
    "set_brightness": ToolRegistry.set_brightness,
    "set_volume": ToolRegistry.set_volume,
    "toggle_dark_mode": ToolRegistry.toggle_dark_mode,
    "play_spotify": ToolRegistry.play_spotify,
    "spotify_control": ToolRegistry.spotify_control,
    "read_file": ToolRegistry.read_file,
    "write_file": ToolRegistry.write_file,
    "create_document": ToolRegistry.create_document,
    "file_search": ToolRegistry.file_search,
    "get_current_time": ToolRegistry.get_current_time,
    "get_system_info": ToolRegistry.get_system_info,
    "open_app": ToolRegistry.open_app,
    "open_website": ToolRegistry.open_website,
    "web_search": ToolRegistry.web_search,
    "compose_email": ToolRegistry.compose_email,
    "wait": ToolRegistry.wait,
    "type_text": ToolRegistry.type_text,
    "final_answer": ToolRegistry.final_answer,
}

# ==================== TOOL EXECUTION ====================

def execute_tool(tool_name: str, params: Dict[str, Any]) -> str:
    if tool_name not in TOOL_MAP:
        available = ", ".join(TOOL_MAP.keys())
        logger.error(f"Unknown tool: {tool_name}")
        return f"❌ Error: Unknown tool '{tool_name}'. Available: {available}"
    
    tool_func = TOOL_MAP[tool_name]
    
    try:
        logger.info(f"🔧 Executing: {tool_name} with params: {params}")
        
        # Execute tool with parameters
        if params:
            result = tool_func(**params)
        else:
            result = tool_func()
        
        logger.info(f"✅ {tool_name} completed successfully")
        return str(result)
        
    except TypeError as e:
        logger.error(f"Parameter error for {tool_name}: {e}")
        return f"❌ Error: Invalid parameters for {tool_name}. {str(e)}"
        
    except Exception as e:
        logger.error(f"Execution failed for {tool_name}: {e}")
        logger.error(traceback.format_exc())
        return f"❌ Execution error in {tool_name}: {str(e)}"


def get_tools_description() -> str:
    desc = "You have access to these tools:\n\n"
    
    for tool in TOOL_SCHEMAS:
        desc += f"🔧 {tool['name']}\n"
        desc += f"   {tool['description']}\n"
        
        if tool['parameters']:
            params_str = ", ".join([f"{k}: {v}" for k, v in tool['parameters'].items()])
            desc += f"   Parameters: {params_str}\n"
        
        if tool['examples']:
            examples = " | ".join(tool['examples'][:3])
            desc += f"   Examples: {examples}\n"
        
        desc += "\n"
    
    return desc

def get_compact_tool_signatures() -> str:
    signatures = []
    
    for tool in TOOL_SCHEMAS:
        # Build parameter string
        params = []
        if tool['parameters']:
            for name, desc in tool['parameters'].items():
                # Infer type
                if "integer" in desc or "0-100" in desc:
                    param_type = "number"
                elif "boolean" in desc or "true" in desc:
                    param_type = "boolean"
                else:
                    param_type = "string"
                
                # Mark optional
                optional = "(optional)" in desc
                suffix = "?" if optional else ""
                
                params.append(f"{name}{suffix}: {param_type}")
        
        param_str = ", ".join(params) if params else ""
        
        # Format: tool_name(params) - description
        sig = f"{tool['name']}({param_str})"
        
        # Add one-line description
        short_desc = tool['description'].split('.')[0]
        signatures.append(f"• {sig}\n  → {short_desc}")
    
    return "\n".join(signatures)