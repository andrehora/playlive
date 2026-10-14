class OverCapacity(Exception):
    pass


class Elevator:
    def __init__(self, capacity):
        self.capacity = capacity
        self.people = 0

    def enter(self, count):
        if count <= 0:
            raise ValueError("Count must be positive")
        if self.people + count > self.capacity:
            raise OverCapacity(f"Only {self.capacity - self.people} more can enter")
        self.people += count
