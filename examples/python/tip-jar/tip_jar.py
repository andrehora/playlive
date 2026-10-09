class TipJar:
    def __init__(self):
        # Private: the leading _ says it is not for callers
        # A change to try: keep a running total in self._total instead of a list
        self._tips = []

    def add(self, amount):
        if amount <= 0:
            raise ValueError("A tip must be positive")
        self._tips.append(amount)

    def total(self):
        total = 0
        for tip in self._tips:
            total += tip
        return total
