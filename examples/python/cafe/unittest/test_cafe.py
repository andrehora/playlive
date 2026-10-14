import unittest
from unittest.mock import Mock
from cafe import Cafe, Menu


# Fake: in-memory version of a dependency
class FakeOrderBook:
    def __init__(self):
        self.totals = {}

    def save(self, order_id, total):
        self.totals[order_id] = total

    def total(self, order_id):
        return self.totals[order_id]


# Stub: returns canned data, no behavior
class StubPromotions:
    def __init__(self, discount):
        self.discount = discount

    def discount_today(self):
        return self.discount


class CafeTest(unittest.TestCase):
    def setUp(self):
        # Real implementation: highest confidence, catches real bugs
        self.menu = Menu()
        self.orders = FakeOrderBook()
        # Mock (interaction): verifies method calls; use sparingly
        self.kitchen = Mock()

    def test_an_order_adds_up_the_menu_prices(self):
        cafe = Cafe(self.menu, StubPromotions(0), self.orders, self.kitchen)
        self.assertEqual(cafe.order(1, ["espresso", "latte"]), 7)

    def test_todays_discount_comes_off_the_total(self):
        cafe = Cafe(self.menu, StubPromotions(1), self.orders, self.kitchen)
        self.assertEqual(cafe.order(1, ["espresso", "latte"]), 6)

    def test_the_order_is_saved(self):
        cafe = Cafe(self.menu, StubPromotions(0), self.orders, self.kitchen)
        cafe.order(1, ["latte"])
        self.assertEqual(self.orders.total(1), 4)

    def test_the_kitchen_gets_a_ticket(self):
        cafe = Cafe(self.menu, StubPromotions(0), self.orders, self.kitchen)
        cafe.order(1, ["latte"])
        self.kitchen.print_ticket.assert_called_once_with(1, ["latte"])


if __name__ == "__main__":
    unittest.main()
