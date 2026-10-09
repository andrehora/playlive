import time


# Allows at most `limit` calls in any `window` seconds
class RateLimiter:
    def __init__(self, limit, window, clock=time.time):
        self.limit = limit
        self.window = window
        self.clock = clock
        self.calls = []

    def allow(self):
        now = self.clock()
        self.calls = [t for t in self.calls if now - t < self.window]
        # A bug to try: if len(self.calls) > self.limit:
        if len(self.calls) >= self.limit:
            return False
        self.calls.append(now)
        return True
