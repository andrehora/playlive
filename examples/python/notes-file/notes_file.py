def save_notes(path, notes):
    with open(path, "w") as f:
        f.write("\n".join(notes))


def load_notes(path):
    try:
        with open(path) as f:
            return [line for line in f.read().split("\n") if line]
    except FileNotFoundError:
        return []
