import unittest
from datetime import date
from voucher import is_expired


class VoucherTest(unittest.TestCase):
    # Bad: it reads the real clock, so it passes until 2030 and then fails, with
    # no change to the code
    def test_a_voucher_for_2030_is_still_good(self):
        self.assertFalse(is_expired(date(2030, 1, 1)))

    # Good: each test says what day it is, so every run gives the same result
    def test_a_voucher_is_good_the_day_before(self):
        expired = is_expired(date(2030, 1, 1), today=date(2029, 12, 31))
        self.assertFalse(expired)

    def test_a_voucher_is_good_on_its_last_day(self):
        expired = is_expired(date(2030, 1, 1), today=date(2030, 1, 1))
        self.assertFalse(expired)

    def test_a_voucher_expires_the_day_after(self):
        expired = is_expired(date(2030, 1, 1), today=date(2030, 1, 2))
        self.assertTrue(expired)


if __name__ == "__main__":
    unittest.main()
