# A real store, cheap enough for tests: a list
class Subscribers:
    def __init__(self):
        self.emails = []

    def add(self, email):
        self.emails.append(email)

    def size(self):
        return len(self.emails)


class Newsletter:
    def __init__(self, store, mailer):
        self.store = store
        self.mailer = mailer

    def subscribe(self, email):
        # A change to try: call a new self.store.add_all([email]) here instead
        self.store.add(email)
        self.mailer.send(email, "Welcome to the newsletter")

    def count(self):
        return self.store.size()
