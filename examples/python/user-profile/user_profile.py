def make_profile(name, email):
    name = name.strip()
    if not name:
        raise ValueError("Name is required")
    # "avatar" came later: "avatar": "default.png"
    return {"name": name, "email": email.lower()}
