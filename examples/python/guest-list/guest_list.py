class GuestList:
    def __init__(self):
        self.guests = []

    def add(self, name):
        self.guests.append(name)

    def count(self):
        return len(self.guests)
