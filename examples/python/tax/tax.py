class Tax:
    def __init__(self, rate):
        self.rate = rate

    def on(self, amount):
        return amount * self.rate / 100


def total_with_tax(prices, tax):
    total = 0
    for price in prices:
        total += price
    # A change to try: add tax.on(price) to each price in the loop instead.
    # The totals stay the same
    return total + tax.on(total)
