from datetime import datetime


def current_hour():
    return datetime.now().hour


def greet(name):
    hour = current_hour()
    if hour < 12:
        return f"Good morning, {name}"
    if hour < 18:
        return f"Good afternoon, {name}"
    return f"Good evening, {name}"
