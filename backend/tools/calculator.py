def calculator(expression: str):
        try:
            return eval(expression, {"__builtins__": None}, {})
        except:
            return "Invalid Math"