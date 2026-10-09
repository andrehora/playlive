import unittest
from unittest.mock import Mock, patch
import shop_hours


class ShopHoursTest(unittest.TestCase):
    # Bad: it mocks is_open, our own rule, so the rule is never tested
    def test_the_sign_says_come_in(self):
        with patch("shop_hours.is_open", return_value=True):
            clock = Mock()
            clock.hour.return_value = 22
            self.assertEqual(shop_hours.sign(clock), "Come in")

    # Good: only the clock, the boundary, is replaced
    def test_open_from_9(self):
        clock = Mock()
        clock.hour.return_value = 9
        text = shop_hours.sign(clock)
        self.assertEqual(text, "Come in")

    def test_closed_before_9(self):
        clock = Mock()
        clock.hour.return_value = 8
        text = shop_hours.sign(clock)
        self.assertEqual(text, "Sorry, we're closed")

    def test_closed_from_17(self):
        clock = Mock()
        clock.hour.return_value = 17
        text = shop_hours.sign(clock)
        self.assertEqual(text, "Sorry, we're closed")


if __name__ == "__main__":
    unittest.main()
