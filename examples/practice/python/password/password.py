import random
import string


def make_password():
    length = random.randint(8, 10)
    characters = string.ascii_letters + string.digits
    return "".join(random.choice(characters) for _ in range(length))
