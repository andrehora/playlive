import random


# Every order earns at least 10 points, and 1 order in 4 earns a bonus on top
def points_for_order():
    if random.random() < 0.25:
        return 10 + random.randint(1, 5)
    return 10
