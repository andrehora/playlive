class Menu:
    def __init__(self, prices):
        self.prices = prices

    def price_of(self, item):
        # A bug to try: return self.prices[item] * 2
        return self.prices[item]


def bill(items, menu):
    total = 0
    for item in items:
        total += menu.price_of(item)
    return total
