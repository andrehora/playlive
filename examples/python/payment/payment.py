# Theirs: a payment library you installed. Its API is not yours to change
class PayCo:
    def create_charge(self, request):
        raise ConnectionError("PayCo is not reachable from tests")


# Ours: the one place that knows PayCo's API. Tests mock this, not PayCo
class Payments:
    def __init__(self, payco):
        self.payco = payco

    # A change to try: PayCo renames create_charge to make_charge. Only this
    # method and the bad test have to change
    def charge(self, euros):
        reply = self.payco.create_charge({"amount_cents": euros * 100, "currency": "EUR"})
        return reply["status"] == "succeeded"


def checkout(total, payments):
    if total <= 0:
        raise ValueError("Nothing to pay")
    if payments.charge(total):
        return "Paid"
    return "Declined"
