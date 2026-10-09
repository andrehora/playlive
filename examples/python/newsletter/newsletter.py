# A real store, cheap enough to use in tests: a list that remembers
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
        # A change to try: give Subscribers an add_all(emails), and call
        # self.store.add_all([email]) here instead
        self.store.add(email)
        self.mailer.send(email, "Welcome to the newsletter")

    def count(self):
        return self.store.size()
