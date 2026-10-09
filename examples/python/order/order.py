class Order:
    def __init__(self, prices):
        self._prices = prices

    # Private: the leading _ says it is not for callers
    # A rename to try: _sum, here and in total()
    def _subtotal(self):
        subtotal = 0
        for price in self._prices:
            subtotal += price
        return subtotal

    # Shipping costs 5, and is free from 50
    def total(self):
        subtotal = self._subtotal()
        if subtotal >= 50:
            return subtotal
        return subtotal + 5
