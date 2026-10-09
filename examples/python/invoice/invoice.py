class Invoice:
    def __init__(self, prices, mailer):
        self.prices = prices
        self.mailer = mailer

    def total(self):
        total = 0
        for price in self.prices:
            total += price
        return total

    def send(self, email):
        self.mailer.send(email, self.total())
