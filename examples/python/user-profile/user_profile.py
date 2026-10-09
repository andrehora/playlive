def make_profile(name, email):
    name = name.strip()
    if not name:
        raise ValueError("Name is required")
    # A change to try: add "avatar": "default.png"
    return {"name": name, "email": email.lower()}
