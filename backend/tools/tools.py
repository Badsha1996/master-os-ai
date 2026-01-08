from .office_ops import create_word_and_pdf
from .weather import get_weather
from .agent_info import agent_info
from .os_actions import open_app, open_website, compose_email

'''
Basic Tools
'''
def echo(text: str) -> str:
    return f"ECHO: {text}"

def get_current_time() -> str:
    from datetime import datetime
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

tools = {
    "open_app": open_app,
    "open_website": open_website,
    "compose_email": compose_email,

    "write_essay_pdf": create_word_and_pdf,

    "agent_info": agent_info,
    "echo": echo,
    "weather": get_weather,
    "get_time": get_current_time,
}