from .weather import get_weather
from .agent_info import agent_info

'''
Basic Tools
'''
def echo(text: str) -> str:
    return f"ECHO: {text}"

def get_current_time() -> str:
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

tools = {
    "agent_info" : agent_info,
    "echo": echo,
    "weather" : get_weather,
    "get_time": get_current_time,
}
