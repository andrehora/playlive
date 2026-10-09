from unittest.mock import Mock
from tea_shop import Menu, bill


# Bad: the menu is a mock, so the real Menu never runs: break it and this
# still passes. It also pins down how bill asks the menu, so a refactor breaks it
def test_bill_asks_the_menu_for_each_price():
    menu = Mock()
    menu.price_of.return_value = 3
    assert bill(["tea", "cake"], menu) == 6
    menu.price_of.assert_any_call("tea")
    menu.price_of.assert_any_call("cake")


# Good: a real Menu, which costs nothing to make
def test_a_bill_adds_up_the_prices():
    menu = Menu({"tea": 3, "cake": 4})
    total = bill(["tea", "cake"], menu)
    assert total == 7


def test_an_empty_bill_is_zero():
    menu = Menu({"tea": 3})
    total = bill([], menu)
    assert total == 0
