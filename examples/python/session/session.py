USERS = {"ana": "secret1", "ben": "secret2"}

# Shared by every caller: who is logged in lives as long as the program does
session = {"user": ""}


def login(name, password):
    if USERS.get(name) != password:
        raise ValueError("Wrong name or password")
    session["user"] = name


def logout():
    session["user"] = ""


def current_user():
    if not session["user"]:
        raise ValueError("No one is logged in")
    return session["user"]


def greeting():
    # A change to try: return "Welcome back, " + current_user()
    return "Hello, " + current_user()
