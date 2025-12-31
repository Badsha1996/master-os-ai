import re


def extract_json(text: str) -> str:
    text = re.sub(r'```json\s*|\s*```', '', text)
    json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', text)
    if json_match:
        return json_match.group(0)

    return text.strip()

