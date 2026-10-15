import random
import string


# Flaky code: look closely at what gets picked.
def generate_password():
    chars = random.choices(string.ascii_letters + string.digits, k=8)
    return "".join(chars)
