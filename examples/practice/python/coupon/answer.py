import random
import string


def make_coupon():
    chars = [random.choice(string.digits)]
    chars += random.choices(string.ascii_uppercase + string.digits, k=5)
    random.shuffle(chars)
    return "".join(chars)
