class Concert:
    def __init__(self, capacity, price):
        self.capacity = capacity
        self.price = price
        self.sold = 0

    def seats_left(self):
        return self.capacity - self.sold

    # 10% off for 5 tickets or more
    def buy(self, count):
        if count < 1:
            raise ValueError("Buy at least 1 ticket")
        if count > self.seats_left():
            raise ValueError("Not enough seats left")
        self.sold += count
        cost = count * self.price
        if count >= 5:
            # A bug to try: cost = cost * 80 / 100
            cost = cost * 90 / 100
        return cost
