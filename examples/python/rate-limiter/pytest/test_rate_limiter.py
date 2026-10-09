from types import SimpleNamespace
from rate_limiter import RateLimiter


# Bad: it uses the real clock, so it passes only if the three calls land within
# one second (a slow machine fails it), and checking the window running out
# would mean really waiting
def test_limits_calls_on_the_real_clock():
    limiter = RateLimiter(limit=2, window=1)
    limiter.allow()
    limiter.allow()
    assert limiter.allow() is False


# Good: the limiter is handed a clock the test sets, so every run is the same
def test_calls_up_to_the_limit_are_allowed():
    clock = SimpleNamespace(now=0)
    limiter = RateLimiter(limit=2, window=60, clock=lambda: clock.now)
    limiter.allow()
    allowed = limiter.allow()
    assert allowed is True


def test_a_call_over_the_limit_is_refused():
    clock = SimpleNamespace(now=0)
    limiter = RateLimiter(limit=2, window=60, clock=lambda: clock.now)
    limiter.allow()
    limiter.allow()
    allowed = limiter.allow()
    assert allowed is False


def test_calls_are_allowed_again_once_the_window_has_passed():
    clock = SimpleNamespace(now=0)
    limiter = RateLimiter(limit=2, window=60, clock=lambda: clock.now)
    limiter.allow()
    limiter.allow()
    clock.now = 60
    allowed = limiter.allow()
    assert allowed is True
