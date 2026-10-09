import random


def draw(names, rand=random.random):
    if not names:
        raise ValueError("No one entered")
    # A bug to try: return names[int(rand() * (len(names) - 1))]
    return names[int(rand() * len(names))]
