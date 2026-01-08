import ctypes
from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
from comtypes import CLSCTX_ALL, cast, POINTER

def system_control(action: str) -> str:
    action = action.lower().strip()
    
    if action == "lock":
        ctypes.windll.user32.LockWorkStation()
        return "🔒 PC Locked"
    
    if "volume" in action or "mute" in action:
        try:
            devices = AudioUtilities.GetSpeakers()
            
            if devices is None:
                return "❌ Error: No audio output device (speakers) found."

            interface = devices.Activate( # type: ignore
                IAudioEndpointVolume._iid_, CLSCTX_ALL, None) # type: ignore
            
            volume = cast(interface, POINTER(IAudioEndpointVolume))
            
            if action == "mute":
                volume.SetMute(1, None) # type: ignore
                return "🔇 System Muted"
            elif action == "unmute":
                volume.SetMute(0, None) # type: ignore
                return "🔊 System Unmuted"
                
        except Exception as e:
            return f"❌ Audio Error: {e}"
    
    return f"⚠️ Action '{action}' not recognized."