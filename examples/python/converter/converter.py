class Converter:
    # In the app, bank_service asks a bank for today's rate
    def __init__(self, bank_service):
        self.bank_service = bank_service

    def to_euros(self, dollars):
        return dollars * self.bank_service.rate("EUR")
