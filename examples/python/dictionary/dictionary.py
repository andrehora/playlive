# Loading a real dictionary takes a while
class Dictionary:
    def __init__(self, entries):
        self.entries = entries

    def define(self, word):
        return self.entries.get(word.lower())
