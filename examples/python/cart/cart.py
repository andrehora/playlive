class Cart:
    def __init__(self):
        self.items = {}
        self.discount = 0

    def add(self, name, price, qty=1):
        if qty < 1:
            raise ValueError("Quantity must be at least 1")
        _, held = self.items.get(name, (price, 0))
        self.items[name] = (price, held + qty)

    def remove(self, name):
        del self.items[name]

    def count(self):
        n = 0
        for _, qty in self.items.values():
            n += qty
        return n

    def apply_coupon(self, code):
        if code != "SAVE10":
            raise ValueError("Unknown coupon")
        self.discount = 10

    def total(self):
        subtotal = 0
        for price, qty in self.items.values():
            subtotal += price * qty
        return round(subtotal * (100 - self.discount)) / 100
