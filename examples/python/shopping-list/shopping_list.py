def parse(text):
    return text.split(", ")


def summary(items):
    return {"count": len(items), "first": items[0]}
