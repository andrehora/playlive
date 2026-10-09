from datetime import datetime
from happy_hour import drink_price


# Bad: it reads the real clock, so it fails from 17:00 to 18:59
def test_a_drink_costs_full_price():
    assert drink_price(4) == 4


# Good: each test says what time it is, so every run is the same
def test_full_price_at_16_59():
    price = drink_price(4, datetime(2026, 10, 9, 16, 59))
    assert price == 4


def test_half_price_at_17_00():
    price = drink_price(4, datetime(2026, 10, 9, 17, 0))
    assert price == 2


def test_full_price_again_at_19_00():
    price = drink_price(4, datetime(2026, 10, 9, 19, 0))
    assert price == 4
