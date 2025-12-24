def add_numbers(numbers):
    if isinstance(numbers, str):
        numbers = eval(numbers)  

    return sum(numbers)
