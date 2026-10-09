class Bookmarks:
    # In the app, the store is a database
    def __init__(self, store):
        self.store = store

    def add(self, url):
        if not self.store.has(url):
            self.store.save(url)

    def all(self):
        return self.store.all()
