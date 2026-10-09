class CoffeeCard:
    def __init__(self, stamps=0):
        self.stamps = stamps

    # Every tenth coffee is free
    def buy(self, price):
        if self.stamps == 9:
            # A bug to try: self.stamps = 1
            self.stamps = 0
            return 0
        self.stamps += 1
        return price
