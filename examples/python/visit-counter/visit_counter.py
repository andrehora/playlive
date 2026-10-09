class VisitCounter:
    def __init__(self, store):
        self.store = store

    def visit(self, page):
        count = self.store.get(page) + 1
        self.store.set(page, count)
        return count
