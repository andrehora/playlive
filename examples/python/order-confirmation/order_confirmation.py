# Ours: the pricing rule, which tests should run for real
def total(items, coupon):
    subtotal = 0
    for price, count in items:
        subtotal += price * count
    if coupon == "SAVE10":
        subtotal -= 10
    return subtotal


# System boundaries: they charge cards and send email, so tests mock them
class Gateway:
    def charge(self, amount):
        raise ConnectionError("No payment gateway in tests")


class Mailer:
    def send(self, to, text):
        raise ConnectionError("No mail server in tests")


def place_order(email, items, coupon, gateway, mailer):
    # A bug to try: amount = total(items, "")
    amount = total(items, coupon)
    if amount <= 0:
        raise ValueError("Nothing to pay")
    gateway.charge(amount)
    mailer.send(email, "Order confirmed: " + str(amount))
    return amount
