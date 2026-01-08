import subprocess
import webbrowser
import platform
import logging

logger = logging.getLogger("tools")

def open_app(app_name: str) -> str:
    app_name = app_name.lower().strip()
    app_map = {
        "vscode": "code",
        "code": "code",
        "browser": "start chrome", 
        "chrome": "start chrome",
        "calculator": "calc",
        "file manager": "explorer",
        "notepad": "notepad",
        "terminal": "cmd",
        "spotify": "spotify"
    }
    
    command = app_map.get(app_name, app_name)
    
    try:
        if platform.system() == "Windows":
            subprocess.Popen(f"start {command}", shell=True)
        else:
            subprocess.Popen(command, shell=True)
            
        return f"✅ Successfully commanded OS to open: {app_name}"
    except Exception as e:
        logger.error(f"Failed to open app: {e}")
        return f"❌ Failed to open '{app_name}'. Error: {e}"

def open_website(url: str) -> str:
    if not url.startswith("http"):
        url = "https://" + url.strip()
    
    try:
        webbrowser.open(url)
        return f"✅ SUCCESS: Browser opened to {url}. (Action complete. You should finish now.)" 
    except Exception as e:
        return f"❌ Failed: {e}"

def compose_email(recipient_and_subject: str) -> str:
    try:
        parts = recipient_and_subject.split("|")
        to = parts[0].strip()
        subject = parts[1].strip() if len(parts) > 1 else "Sent from AI Agent"
        
        # This URL opens Gmail's compose window directly
        url = f"https://mail.google.com/mail/?view=cm&fs=1&to={to}&su={subject}"
        
        webbrowser.open(url)
        return f"✅ Opened Gmail compose window for: {to}"
    except Exception as e:
        return f"❌ Failed to open email composer. Error: {e}"