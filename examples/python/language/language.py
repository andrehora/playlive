# The app's settings, shared by every part of it
settings = {"language": "en"}


def greet(name):
    if settings["language"] == "pt":
        return "Olá, " + name
    return "Hello, " + name
