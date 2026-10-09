from datetime import date
from voucher import is_expired


# Bad: it reads the real clock, so it passes until 2030 and then fails, with
# no change to the code
def test_a_voucher_for_2030_is_still_good():
    assert is_expired(date(2030, 1, 1)) is False


# Good: each test says what day it is, so every run gives the same result
def test_a_voucher_is_good_the_day_before():
    expired = is_expired(date(2030, 1, 1), today=date(2029, 12, 31))
    assert expired is False


def test_a_voucher_is_good_on_its_last_day():
    expired = is_expired(date(2030, 1, 1), today=date(2030, 1, 1))
    assert expired is False


def test_a_voucher_expires_the_day_after():
    expired = is_expired(date(2030, 1, 1), today=date(2030, 1, 2))
    assert expired is True
