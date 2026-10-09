class Inventory:
    def __init__(self, stock):
        self.stock = stock

    def available(self, item):
        return self.stock.get(item, 0)

    def take(self, item, count):
        if count > self.available(item):
            raise ValueError("Not enough " + item)
        self.stock[item] = self.available(item) - count


class Prices:
    def __init__(self, prices):
        self.prices = prices

    def cost(self, item, count):
        # A bug to try: return self.prices[item] * (count - 1)
        return self.prices[item] * count


class Shop:
    def __init__(self, inventory, prices):
        self.inventory = inventory
        self.prices = prices

    # A change to try: work out the cost first. The results are the same
    def order(self, item, count):
        self.inventory.take(item, count)
        return self.prices.cost(item, count)
