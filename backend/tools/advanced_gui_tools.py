import time
import logging
import subprocess
from typing import List, Optional, Tuple
from pathlib import Path

logger = logging.getLogger("gui_automation")

# Import GUI libraries with fallbacks
try:
    import pyautogui
    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.1
    PYAUTOGUI_AVAILABLE = True
except ImportError:
    PYAUTOGUI_AVAILABLE = False

try:
    import pygetwindow as gw
    WINDOW_CONTROL_AVAILABLE = True
except ImportError:
    WINDOW_CONTROL_AVAILABLE = False

try:
    from PIL import Image
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False


class AdvancedGUITools:
    
    @staticmethod
    def find_and_click(text: str, confidence: float = 0.8) -> str:
        if not PYAUTOGUI_AVAILABLE:
            return "❌ pyautogui not available"
        
        try:
            location = pyautogui.locateOnScreen(text, confidence=confidence) # type: ignore
            if location:
                center = pyautogui.center(location) # type: ignore
                pyautogui.click(center) # type: ignore
                return f"✅ Clicked '{text}' at {center}"
            
            return f"❌ Could not find '{text}' on screen"
        except Exception as e:
            return f"❌ Click failed: {e}"
    
    @staticmethod
    def click_at(x: int, y: int, clicks: int = 1, button: str = "left") -> str:
        """Click at specific coordinates."""
        if not PYAUTOGUI_AVAILABLE:
            return "❌ pyautogui not available"
        
        try:
            pyautogui.click(x, y, clicks=clicks, button=button) # type: ignore
            return f"✅ Clicked at ({x}, {y})"
        except Exception as e:
            return f"❌ Click failed: {e}"
    
    @staticmethod
    def move_mouse(x: int, y: int, duration: float = 0.5) -> str:
        """Move mouse smoothly to position."""
        if not PYAUTOGUI_AVAILABLE:
            return "❌ pyautogui not available"
        
        try:
            pyautogui.moveTo(x, y, duration=duration) # type: ignore
            return f"✅ Moved to ({x}, {y})"
        except Exception as e:
            return f"❌ Move failed: {e}"
    
    @staticmethod
    def drag_to(start_x: int, start_y: int, end_x: int, end_y: int, duration: float = 1.0) -> str:
        """Drag from one point to another."""
        if not PYAUTOGUI_AVAILABLE:
            return "❌ pyautogui not available"
        
        try:
            pyautogui.moveTo(start_x, start_y) # type: ignore
            pyautogui.dragTo(end_x, end_y, duration=duration) # type: ignore
            return f"✅ Dragged from ({start_x}, {start_y}) to ({end_x}, {end_y})"
        except Exception as e:
            return f"❌ Drag failed: {e}"
    
    @staticmethod
    def scroll(clicks: int, direction: str = "down") -> str:
        """Scroll up/down."""
        if not PYAUTOGUI_AVAILABLE:
            return "❌ pyautogui not available"
        
        try:
            amount = -clicks if direction == "down" else clicks
            pyautogui.scroll(amount) # type: ignore
            return f"✅ Scrolled {direction} {abs(clicks)} clicks"
        except Exception as e:
            return f"❌ Scroll failed: {e}"
    
    @staticmethod
    def get_window_list() -> str:
        """Get all open windows."""
        if not WINDOW_CONTROL_AVAILABLE:
            return "❌ pygetwindow not available"
        
        try:
            windows = gw.getAllTitles() # type: ignore
            visible = [w for w in windows if w.strip()]
            
            if not visible:
                return "❌ No windows found"
            
            result = "🪟 Open Windows:\n"
            for i, title in enumerate(visible[:20], 1):
                result += f"  {i}. {title}\n"
            
            return result
        except Exception as e:
            return f"❌ Window list error: {e}"
    
    @staticmethod
    def focus_window(title_contains: str) -> str:
        """Focus/activate a window by partial title match."""
        if not WINDOW_CONTROL_AVAILABLE:
            return "❌ pygetwindow not available"
        
        try:
            windows = gw.getWindowsWithTitle(title_contains) # type: ignore
            
            if not windows:
                return f"❌ No window found containing '{title_contains}'"
            
            window = windows[0]
            
            if window.isMinimized:
                window.restore()
            
            window.activate()
            
            return f"✅ Focused window: {window.title}"
        except Exception as e:
            return f"❌ Focus failed: {e}"
    
    @staticmethod
    def minimize_window(title_contains: str) -> str:
        """Minimize a window."""
        if not WINDOW_CONTROL_AVAILABLE:
            return "❌ pygetwindow not available"
        
        try:
            windows = gw.getWindowsWithTitle(title_contains) # type: ignore
            if windows:
                windows[0].minimize()
                return f"✅ Minimized: {windows[0].title}"
            return f"❌ No window found: {title_contains}"
        except Exception as e:
            return f"❌ Minimize failed: {e}"
    
    @staticmethod
    def maximize_window(title_contains: str) -> str:
        """Maximize a window."""
        if not WINDOW_CONTROL_AVAILABLE:
            return "❌ pygetwindow not available"
        
        try:
            windows = gw.getWindowsWithTitle(title_contains) # type: ignore
            if windows:
                windows[0].maximize()
                return f"✅ Maximized: {windows[0].title}"
            return f"❌ No window found: {title_contains}"
        except Exception as e:
            return f"❌ Maximize failed: {e}"
    
    @staticmethod
    def close_window(title_contains: str) -> str:
        """Close a window by title."""
        if not WINDOW_CONTROL_AVAILABLE:
            return "❌ pygetwindow not available"
        
        try:
            windows = gw.getWindowsWithTitle(title_contains) # type: ignore
            if windows:
                windows[0].close()
                return f"✅ Closed: {windows[0].title}"
            return f"❌ No window found: {title_contains}"
        except Exception as e:
            return f"❌ Close failed: {e}"
    
    @staticmethod
    def read_screen_text(region: Optional[Tuple[int, int, int, int]] = None) -> str:
        """
        Use OCR to read text from screen.
        region: (left, top, width, height)
        """
        if not OCR_AVAILABLE:
            return "❌ OCR not available (install pytesseract + PIL)"
        
        if not PYAUTOGUI_AVAILABLE:
            return "❌ pyautogui not available"
        
        try:
            if region:
                screenshot = pyautogui.screenshot(region=region) # type: ignore
            else:
                screenshot = pyautogui.screenshot() # type: ignore
            
            text = pytesseract.image_to_string(screenshot) # type: ignore
            
            if not text.strip():
                return "❌ No text found on screen"
            
            return f"📖 Screen Text:\n{text.strip()}"
        except Exception as e:
            return f"❌ OCR failed: {e}"
    
    @staticmethod
    def get_mouse_position() -> str:
        if not PYAUTOGUI_AVAILABLE:
            return "❌ pyautogui not available"
        
        try:
            x, y = pyautogui.position() # type: ignore
            return f"🖱️ Mouse at: ({x}, {y})"
        except Exception as e:
            return f"❌ Position error: {e}"
    
    @staticmethod
    def get_screen_size() -> str:
        if not PYAUTOGUI_AVAILABLE:
            return "❌ pyautogui not available"
        
        try:
            width, height = pyautogui.size() # type: ignore
            return f"🖥️ Screen: {width}x{height}"
        except Exception as e:
            return f"❌ Screen size error: {e}"
    
    @staticmethod
    def press_keys_sequence(keys: List[str], interval: float = 0.1) -> str:
        if not PYAUTOGUI_AVAILABLE:
            return "❌ pyautogui not available"
        
        try:
            for key in keys:
                pyautogui.press(key) # type: ignore
                time.sleep(interval)
            
            return f"✅ Pressed sequence: {', '.join(keys)}"
        except Exception as e:
            return f"❌ Key sequence failed: {e}"
    
    @staticmethod
    def hold_and_click(hold_key: str, x: int, y: int) -> str:
        if not PYAUTOGUI_AVAILABLE:
            return "❌ pyautogui not available"
        
        try:
            with pyautogui.hold(hold_key): # type: ignore
                pyautogui.click(x, y) # type: ignore
            
            return f"✅ {hold_key}+Click at ({x}, {y})"
        except Exception as e:
            return f"❌ Hold+Click failed: {e}"
    
    @staticmethod
    def navigate_and_uninstall(app_name: str) -> str:
        import platform
        
        try:
            if platform.system() == "Windows":
                # Open Apps & Features (Windows 10/11)
                subprocess.run(["control", "appwiz.cpl"], shell=True)
                time.sleep(2)
                
                # Type app name in search
                pyautogui.write(app_name, interval=0.05) # type: ignore
                time.sleep(1)
                
                # Press Tab to focus on list, then Enter
                pyautogui.press("tab") # type: ignore
                time.sleep(0.3)
                pyautogui.press("enter") # type: ignore
                time.sleep(0.5)
                
                
                return f"✅ Navigated to uninstall {app_name}. Please confirm manually."
            else:
                return "❌ Auto-uninstall only supported on Windows"
                
        except Exception as e:
            return f"❌ Navigation failed: {e}"


# Export all tools
GUI_TOOLS = {
    "click_at": AdvancedGUITools.click_at,
    "move_mouse": AdvancedGUITools.move_mouse,
    "drag_to": AdvancedGUITools.drag_to,
    "scroll": AdvancedGUITools.scroll,
    "get_window_list": AdvancedGUITools.get_window_list,
    "focus_window": AdvancedGUITools.focus_window,
    "minimize_window": AdvancedGUITools.minimize_window,
    "maximize_window": AdvancedGUITools.maximize_window,
    "close_window": AdvancedGUITools.close_window,
    "read_screen_text": AdvancedGUITools.read_screen_text,
    "get_mouse_position": AdvancedGUITools.get_mouse_position,
    "get_screen_size": AdvancedGUITools.get_screen_size,
    "press_keys_sequence": AdvancedGUITools.press_keys_sequence,
    "hold_and_click": AdvancedGUITools.hold_and_click,
    "find_and_click": AdvancedGUITools.find_and_click,
    "navigate_and_uninstall": AdvancedGUITools.navigate_and_uninstall,
}