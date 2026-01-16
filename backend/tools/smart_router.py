import re
import logging
import os
from typing import Dict, Optional, Tuple
from tools.tools import execute_tool

logger = logging.getLogger("smart_router")

class SmartTaskRouter:
    INSTANT_RESPONSES = {
        # Greetings
        r"^(hi|hello|hey|sup|yo|greetings)[\s!.]*$": [
            "Hello! How can I help you control your system today?",
            "Hi there! Ready to assist you.",
            "Hey! What can I do for you?",
        ],
        r"^(good morning|morning)[\s!.]*$": [
            "Good morning! Hope you're having a great day. What can I help with?",
        ],
        r"^(good afternoon|afternoon)[\s!.]*$": [
            "Good afternoon! What can I assist you with?",
        ],
        r"^(good evening|evening)[\s!.]*$": [
            "Good evening! How can I help you?",
        ],
        r"^(good night|goodnight|night)[\s!.]*$": [
            "Good night! Sleep well!",
        ],
        
        # How are you
        r"^(how are you|how r u|how're you|hows it going|wassup|what's up|whats up)[\s?!.]*$": [
            "I'm functioning perfectly! All systems operational. What can I do for you?",
            "Running smoothly! Ready to help. What do you need?",
        ],
        
        # Thanks
        r"^(thanks|thank you|thx|ty)[\s!.]*$": [
            "You're welcome! Happy to help.",
            "Anytime! Let me know if you need anything else.",
            "Glad I could help!",
        ],
        
        # Bye
        r"^(bye|goodbye|see you|cya|later)[\s!.]*$": [
            "Goodbye! Feel free to come back anytime.",
            "See you later! Take care.",
        ],
        
        # Help/What can you do
        r"^(help|what can you do|capabilities|features)[\s?!.]*$": [
            """I can help you with:
• Open/close apps (Chrome, VS Code, Spotify, etc.)
• Search the web (YouTube, Google)
• Control system (brightness, volume, dark mode)
• Manage files (find, read, write)
• Window control (focus, minimize, maximize)
• Take screenshots, automate tasks
• And much more!

Just tell me what you need!""",
        ],
        
        # What's your name
        r"^(what's your name|who are you|what are you)[\s?!.]*$": [
            "I'm Master-OS, your AI system controller. I can control apps, files, and automate tasks on your computer!",
        ],
    }
    
    # Common app name mappings
    APP_ALIASES = {
        # Browsers
        "chrome": "Google Chrome",
        "firefox": "firefox",
        "edge": "msedge",
        "brave": "brave",
        "opera": "opera",
        "safari": "Safari",
        
        # Communication
        "discord": "Discord",
        "slack": "Slack",
        "teams": "Microsoft Teams",
        "zoom": "zoom",
        "skype": "Skype",
        
        # Development
        "vscode": "Code",
        "visual studio code": "Code",
        "pycharm": "pycharm",
        "sublime": "sublime_text",
        "atom": "atom",
        "intellij": "idea",
        
        # Productivity
        "word": "Microsoft Word",
        "excel": "Microsoft Excel",
        "powerpoint": "Microsoft PowerPoint",
        "outlook": "Microsoft Outlook",
        "onenote": "OneNote",
        "notion": "Notion",
        
        # Media
        "spotify": "Spotify",
        "vlc": "vlc",
        "itunes": "iTunes",
        "netflix": "Netflix",
        
        # Utilities
        "notepad": "notepad",
        "calculator": "calc",
        "terminal": "cmd" if os.name == 'nt' else "terminal",
        "cmd": "cmd",
        "powershell": "powershell",
        "task manager": "taskmgr",
        "control panel": "control",
        "settings": "ms-settings:",
    }
    
    def __init__(self):
        self.patterns = self._compile_patterns()
    
    def _compile_patterns(self) -> list:
        """Compile regex patterns for instant matching."""
        return [
            # Media playback
            (r"(?:play|search|find|open)\s+(.+?)\s+(?:on\s+)?(youtube|spotify)", 
             self._handle_media_search),
            
            # Open apps
            (r"(?:open|launch|start|run)\s+(.+?)(?:\s+(?:app|application|program))?$",
             self._handle_open_app),
            
            # Close apps
            (r"(?:close|kill|stop|quit|end)\s+(.+?)(?:\s+(?:app|application|program))?$",
             self._handle_close_app),
            
            # Web actions
            (r"(?:search|google|look up|find)\s+(.+?)(?:\s+(?:on\s+)?(?:google|web|internet))?$",
             self._handle_web_search),
            (r"(?:go to|open|visit)\s+([a-zA-Z0-9.-]+\.[a-z]{2,})",
             self._handle_open_website),
            
            # System controls
            (r"(?:set|change|adjust)\s+(?:brightness|screen brightness)\s+(?:to\s+)?(\d+)",
             self._handle_brightness),
            (r"(?:set|change|adjust)\s+volume\s+(?:to\s+)?(\d+)",
             self._handle_volume),
            (r"(?:enable|turn on|activate)\s+dark\s+mode",
             lambda m: ("toggle_dark_mode", {"enable": True})),
            (r"(?:disable|turn off|deactivate)\s+dark\s+mode",
             lambda m: ("toggle_dark_mode", {"enable": False})),
            
            # File operations
            (r"(?:find|search|locate)\s+(?:file\s+)?(.+)",
             self._handle_file_search),
            (r"(?:what|tell me the)\s+time",
             lambda m: ("get_current_time", {})),
            
            # Screenshots
            (r"(?:take\s+(?:a\s+)?screenshot|capture\s+screen)",
             lambda m: ("take_screenshot", {})),
            
            # System info
            (r"(?:system\s+info|computer\s+specs|my\s+pc)",
             lambda m: ("get_system_info", {})),
            
            # Power
            (r"(shutdown|restart|sleep|lock)\s+(?:computer|pc|system)?",
             self._handle_power),
        ]
    
    def _handle_media_search(self, match) -> Tuple[str, Dict]|None:
        query = match.group(1).strip()
        platform = match.group(2).lower()
        
        if platform == "youtube":
            return ("web_search", {
                "query": query,
                "engine": "youtube"
            })
        elif platform == "spotify":
            return ("play_spotify", {"query": query})
        
        return None
    
    def _handle_open_app(self, match) -> Tuple[str, Dict]:
        app_name = match.group(1).strip().lower()
        
        # Resolve aliases
        resolved = self.APP_ALIASES.get(app_name, app_name)
        
        return ("open_app", {"app_name": resolved})
    
    def _handle_close_app(self, match) -> Tuple[str, Dict]:
        app_name = match.group(1).strip()
        return ("terminate_process", {"process_name_or_pid": app_name})
    
    def _handle_web_search(self, match) -> Tuple[str, Dict]:
        query = match.group(1).strip()
        return ("web_search", {"query": query, "engine": "google"})
    
    def _handle_open_website(self, match) -> Tuple[str, Dict]:
        url = match.group(1).strip()
        return ("open_website", {"url": url})
    
    def _handle_brightness(self, match) -> Tuple[str, Dict]:
        value = int(match.group(1))
        return ("set_brightness", {"value": value})
    
    def _handle_volume(self, match) -> Tuple[str, Dict]:
        value = int(match.group(1))
        return ("set_volume", {"value": value})
    
    def _handle_file_search(self, match) -> Tuple[str, Dict]:
        query = match.group(1).strip()
        return ("file_search", {"query": query})
    
    def _handle_power(self, match) -> Tuple[str, Dict]:
        action = match.group(1).lower()
        return ("system_power", {"action": action})
    
    def route(self, user_input: str) -> Optional[Tuple[str, Dict]]:
        """
        Try to match user input to:
        1. Instant conversational response
        2. Direct tool action
        Returns (tool_name, params) if matched, None for LLM reasoning.
        """
        user_input_clean = user_input.strip().lower()
        
        # Check for instant conversational responses first
        instant_response = self._check_instant_response(user_input_clean)
        if instant_response:
            # Return as special "instant_answer" action
            return ("instant_answer", {"answer": instant_response})
        
        # Check for tool-based commands
        for pattern, handler in self.patterns:
            match = re.search(pattern, user_input_clean, re.IGNORECASE)
            if match:
                try:
                    result = handler(match)
                    if result:
                        logger.info(f"✅ Direct route: {user_input} -> {result[0]}")
                        return result
                except Exception as e:
                    logger.error(f"Pattern handler error: {e}")
                    continue
        
        return None
    
    def _check_instant_response(self, user_input: str) -> Optional[str]:
        """Check if input matches instant response patterns."""
        import random
        
        for pattern, responses in self.INSTANT_RESPONSES.items():
            if re.match(pattern, user_input, re.IGNORECASE):
                # Pick random response for variety
                return random.choice(responses)
        
        return None
    
    def needs_llm(self, user_input: str) -> bool:
        """
        Determine if a query needs LLM reasoning.
        Returns False for simple conversational queries.
        """
        user_input_clean = user_input.strip().lower()
        
        # If it matches instant responses, no LLM needed
        if self._check_instant_response(user_input_clean):
            return False
        
        # If it matches tool patterns, no LLM needed
        for pattern, _ in self.patterns:
            if re.search(pattern, user_input_clean, re.IGNORECASE):
                return False
        
        # Simple conversational queries (no tools needed)
        simple_patterns = [
            r"^(ok|okay|cool|nice|great|awesome|perfect)[\s!.]*$",
            r"^(yes|yeah|yep|no|nope|nah)[\s!.]*$",
            r"^(lol|haha|hehe)[\s!.]*$",
        ]
        
        for pattern in simple_patterns:
            if re.match(pattern, user_input_clean, re.IGNORECASE):
                return False  # Don't need LLM for acknowledgments
        
        # If it's very short and doesn't look like a command, might not need LLM
        if len(user_input_clean.split()) <= 2 and "?" not in user_input:
            # Could be just acknowledgment or unclear
            return False
        
        return True  # Needs LLM for everything else


def execute_direct(tool_name: str, params: Dict) -> str:
    """Execute tool directly without LLM reasoning."""
    logger.info(f"⚡ Direct execution: {tool_name}({params})")
    return execute_tool(tool_name, params)