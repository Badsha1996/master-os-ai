import pyautogui
from datetime import datetime
import os

def capture_screen(label: str) -> str:
    desktop = os.path.join(os.path.join(os.environ['USERPROFILE']), 'Desktop')
    timestamp = datetime.now().strftime("%H-%M-%S")
    filepath = os.path.join(desktop, f"screenshot_{label}_{timestamp}.png")
    
    screenshot = pyautogui.screenshot()
    screenshot.save(filepath)
    
    return f"📸 Screenshot saved to Desktop: {filepath}"