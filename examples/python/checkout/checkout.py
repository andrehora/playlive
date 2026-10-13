class PriceList:
    def __init__(self, prices):
        self.prices = prices

    def price_of(self, item):
        if item not in self.prices:
            raise KeyError(f"No price for {item}")
        return self.prices[item]


class Cart:
    def __init__(self):
        self.items = []

    def add(self, item, quantity=1):
        self.items.append((item, quantity))


class Checkout:
    def __init__(self, price_list, tax_rate):
        self.price_list = price_list
        self.tax_rate = tax_rate

    def total(self, cart):
        subtotal = sum(self.price_list.price_of(item) * quantity for item, quantity in cart.items)
        return round(subtotal * (1 + self.tax_rate), 2)
