# Rainfall in millimetres, one reading a day
def total(readings):
    result = 0
    for reading in readings:
        result += reading
    return result


def average(readings):
    return total(readings) / len(readings)
