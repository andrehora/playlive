from unittest.mock import Mock
import shop_hours


# Bad: it mocks is_open, our own rule, so the rule is never tested
def test_the_sign_says_come_in(monkeypatch):
    monkeypatch.setattr(shop_hours, "is_open", lambda hour: True)
    clock = Mock()
    clock.hour.return_value = 22
    assert shop_hours.sign(clock) == "Come in"


# Good: only the clock, the boundary, is replaced
def test_open_from_9():
    clock = Mock()
    clock.hour.return_value = 9
    text = shop_hours.sign(clock)
    assert text == "Come in"


def test_closed_before_9():
    clock = Mock()
    clock.hour.return_value = 8
    text = shop_hours.sign(clock)
    assert text == "Sorry, we're closed"


def test_closed_from_17():
    clock = Mock()
    clock.hour.return_value = 17
    text = shop_hours.sign(clock)
    assert text == "Sorry, we're closed"
