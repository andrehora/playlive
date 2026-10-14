def make_username(first, last):
    if not first or not last:
        raise ValueError("First and last name are required")
    return (first[0] + last).replace(" ", "").lower()


def username_is_used(username, existing):
    return username.lower() in [name.lower() for name in existing]


def suggest(username, existing):
    candidate = username
    number = 2
    while username_is_used(candidate, existing):
        candidate = f"{username}{number}"
        number += 1
    return candidate
