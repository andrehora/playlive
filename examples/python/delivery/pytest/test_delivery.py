from datetime import date
from delivery import ships_today


# Bad: it reads the real date, so it fails at the weekend
def test_an_order_ships_today():
    assert ships_today() is True


# Good: each test says what day it is, so every run is the same
def test_a_friday_order_ships_today():
    ships = ships_today(date(2026, 10, 9))
    assert ships is True


def test_a_saturday_order_waits():
    ships = ships_today(date(2026, 10, 10))
    assert ships is False


def test_a_sunday_order_waits():
    ships = ships_today(date(2026, 10, 11))
    assert ships is False
