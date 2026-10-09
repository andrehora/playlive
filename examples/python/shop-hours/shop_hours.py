import time


# Ours: the rule, which tests should run for real
def is_open(hour):
    return hour >= 9 and hour < 17


# A system boundary: the real clock moves on, so tests replace it
class Clock:
    def hour(self):
        return time.localtime().tm_hour


def sign(clock):
    # A bug to try: if is_open(clock.hour() + 1):
    if is_open(clock.hour()):
        return "Come in"
    return "Sorry, we're closed"
