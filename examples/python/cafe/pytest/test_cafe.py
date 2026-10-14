import pytest
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


@pytest.fixture
def orders():
    return FakeOrderBook()


# Mock (interaction): verifies method calls; use sparingly
@pytest.fixture
def kitchen():
    return Mock()


# Real implementation: highest confidence, catches real bugs
@pytest.fixture
def menu():
    return Menu()


def test_an_order_adds_up_the_menu_prices(menu, orders, kitchen):
    cafe = Cafe(menu, StubPromotions(0), orders, kitchen)
    assert cafe.order(1, ["espresso", "latte"]) == 7


def test_todays_discount_comes_off_the_total(menu, orders, kitchen):
    cafe = Cafe(menu, StubPromotions(1), orders, kitchen)
    assert cafe.order(1, ["espresso", "latte"]) == 6


def test_the_order_is_saved(menu, orders, kitchen):
    cafe = Cafe(menu, StubPromotions(0), orders, kitchen)
    cafe.order(1, ["latte"])
    assert orders.total(1) == 4


def test_the_kitchen_gets_a_ticket(menu, orders, kitchen):
    cafe = Cafe(menu, StubPromotions(0), orders, kitchen)
    cafe.order(1, ["latte"])
    kitchen.print_ticket.assert_called_once_with(1, ["latte"])
