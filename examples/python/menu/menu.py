MENU = {"soup": 4, "salad": 6, "steak": 15}


def dishes():
    return list(MENU)


def price_of(dish):
    return MENU.get(dish)
