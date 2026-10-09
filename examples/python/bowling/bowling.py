# The score of a game of ten-pin bowling, from the pins each roll knocked down
def score(rolls):
    total = 0
    i = 0
    frame = 0
    while frame < 10:
        if rolls[i] == 10:
            total += 10 + rolls[i + 1] + rolls[i + 2]
            i += 1
        elif rolls[i] + rolls[i + 1] == 10:
            # A bug to try: total += 10 + rolls[i + 1]
            total += 10 + rolls[i + 2]
            i += 2
        else:
            total += rolls[i] + rolls[i + 1]
            i += 2
        frame += 1
    return total
