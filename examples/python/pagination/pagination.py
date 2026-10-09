import math


def page_count(total, size):
    if size < 1:
        raise ValueError("Page size must be at least 1")
    # A bug to try: return math.floor(total / size)
    return math.ceil(total / size)


def page(items, number, size):
    if number < 1 or number > page_count(len(items), size):
        raise ValueError("No such page")
    start = (number - 1) * size
    return items[start:start + size]
