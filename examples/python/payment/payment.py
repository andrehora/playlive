# Theirs: a payment library. Its API is not yours to change
class PayCo:
    def create_charge(self, request):
        raise ConnectionError("PayCo is not reachable from tests")


# Ours: the only code that knows PayCo. Tests mock this
class Payments:
    def __init__(self, payco):
        self.payco = payco

    # A change to try: PayCo renames create_charge. Only this and the bad test change
    def charge(self, euros):
        reply = self.payco.create_charge({"amount_cents": euros * 100, "currency": "EUR"})
        return reply["status"] == "succeeded"


def checkout(total, payments):
    if total <= 0:
        raise ValueError("Nothing to pay")
    if payments.charge(total):
        return "Paid"
    return "Declined"
