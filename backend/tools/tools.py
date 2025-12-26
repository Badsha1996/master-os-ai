from .weather import get_weather
from .calculator import calculator
from .echo import echo
from .agent_info import agent_info

tools = {
    "agent_info" : agent_info,
    "echo": echo,
    "calculator": calculator,
    "weather" : get_weather
}
