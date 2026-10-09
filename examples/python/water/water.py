# What water is at a temperature in °C
def state(celsius):
    if celsius <= 0:
        return "ice"
    if celsius >= 100:
        return "steam"
    return "water"
