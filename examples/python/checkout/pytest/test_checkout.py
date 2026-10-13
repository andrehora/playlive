import pytest
from checkout import Cart, Checkout, PriceList


def test_totals_the_cart_with_tax():
    cart = Cart()
    cart.add("tea", 2)
    cart.add("cake")
    checkout = Checkout(PriceList({"tea": 4.0, "cake": 3.5}), tax_rate=0.1)
    assert checkout.total(cart) == 12.65


def test_totals_an_empty_cart_as_zero():
    checkout = Checkout(PriceList({"tea": 4.0}), tax_rate=0.1)
    assert checkout.total(Cart()) == 0


def test_refuses_an_item_with_no_price():
    cart = Cart()
    cart.add("coffee")
    checkout = Checkout(PriceList({"tea": 4.0}), tax_rate=0.1)
    with pytest.raises(KeyError):
        checkout.total(cart)
