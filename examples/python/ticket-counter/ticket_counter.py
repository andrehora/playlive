# Shared by every caller: it lives as long as the program does
counter = {"next": 1}


def take_ticket():
    number = counter["next"]
    # A bug to try: counter["next"] += 2
    counter["next"] += 1
    return number


def reset():
    counter["next"] = 1
