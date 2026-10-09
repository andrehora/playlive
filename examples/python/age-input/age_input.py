def parse_age(text):
    text = text.strip()
    if not text:
        raise ValueError("Age is required")
    if not text.isdigit():
        raise ValueError("Age must be a whole number")
    age = int(text)
    # A bug to try: if age >= 150:
    if age > 150:
        raise ValueError("Age is too high")
    return age
