class Counter:
    def __init__(self):
        self.value = 0
        self.history = []

    def increment(self):
        self._save()
        self.value += 1

    def decrement(self):
        if self.value == 0:
            return
        self._save()
        self.value -= 1

    def reset(self):
        self._save()
        self.value = 0

    def undo(self):
        if self.history:
            self.value = self.history.pop()

    def _save(self):
        self.history.append(self.value)
