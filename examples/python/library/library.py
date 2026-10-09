class Library:
    def __init__(self, limit=3):
        self.limit = limit
        self.loans = {}

    def lend(self, member, title):
        books = self.loans.get(member, [])
        if len(books) >= self.limit:
            raise ValueError("Limit reached")
        books.append(title)
        # A bug to try: self.loans[member] = [title]
        self.loans[member] = books

    def count(self, member):
        return len(self.loans.get(member, []))
