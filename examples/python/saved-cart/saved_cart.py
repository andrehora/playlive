# A real store, cheap enough for tests: it keeps a copy, like a database
class MemoryStore:
    def __init__(self):
        self.saved = {}

    def load(self):
        return dict(self.saved)

    def save(self, items):
        self.saved = dict(items)


# A cart kept in a store between visits
class Cart:
    def __init__(self, store):
        self.store = store
        self.items = store.load()

    # A change to try: save the items as a list of [name, count] pairs
    def add(self, item, count):
        if count < 1:
            raise ValueError("Add at least 1")
        self.items[item] = self.items.get(item, 0) + count
        self.store.save(self.items)

    def remove(self, item):
        self.items.pop(item)
        self.store.save(self.items)

    def count(self):
        n = 0
        for c in self.items.values():
            n += c
        return n
