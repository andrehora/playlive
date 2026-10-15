import random
import string


def make_coupon():
    chars = random.choices(string.ascii_uppercase + string.digits, k=6)
    return "".join(chars)
