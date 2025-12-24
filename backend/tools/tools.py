from .echo import echo
from .add_numbers import add_numbers
from .agent_info import agent_info

tools = {
    "agent_info" : agent_info,
    "echo": echo,
    "add_numbers": add_numbers,
}
