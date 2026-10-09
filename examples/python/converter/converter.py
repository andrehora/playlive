class Converter:
    # In the app, rates asks a bank for today's rate
    def __init__(self, rates):
        self.rates = rates

    def to_euros(self, dollars):
        return dollars * self.rates.rate("EUR")
