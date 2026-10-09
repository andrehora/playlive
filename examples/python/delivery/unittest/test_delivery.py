import unittest
from datetime import date
from delivery import ships_today


class DeliveryTest(unittest.TestCase):
    # Bad: it reads the real date, so it fails at the weekend
    def test_an_order_ships_today(self):
        self.assertIs(ships_today(), True)

    # Good: each test says what day it is, so every run is the same
    def test_a_friday_order_ships_today(self):
        ships = ships_today(date(2026, 10, 9))
        self.assertIs(ships, True)

    def test_a_saturday_order_waits(self):
        ships = ships_today(date(2026, 10, 10))
        self.assertIs(ships, False)

    def test_a_sunday_order_waits(self):
        ships = ships_today(date(2026, 10, 11))
        self.assertIs(ships, False)


if __name__ == "__main__":
    unittest.main()
