import json
import re
def echo(text: str):
    return f"ECHO: {text}"


def add_numbers(text: str):
    try:
        # Case 1: JSON list "[4,7]"
        if text.strip().startswith("["):
            nums = json.loads(text)
            return sum(int(x) for x in nums)

        # Case 2: Free text "add 4 and 7"
        nums = re.findall(r"-?\d+", text)
        return sum(int(x) for x in nums)

    except Exception as e:
        raise ValueError(f"Invalid input for add_numbers: {text}")

