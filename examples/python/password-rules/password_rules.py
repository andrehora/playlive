def strength(password):
    if len(password) < 8:
        return "weak"
    if password.isalpha():
        # A bug to try: return "weak"
        return "medium"
    return "strong"
