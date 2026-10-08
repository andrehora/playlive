import pytest
from cart import Cart


def test_new_cart_is_empty():
    cart = Cart()
    assert cart.count() == 0
    assert cart.total() == 0


def test_adding_the_same_item_twice_adds_up():
    cart = Cart()
    cart.add("Mug", 8.50)
    cart.add("Mug", 8.50, qty=2)
    assert cart.count() == 3
    assert cart.total() == 25.50


def test_coupon_takes_ten_percent_off():
    cart = Cart()
    cart.add("Lamp", 40)
    cart.apply_coupon("SAVE10")
    assert cart.total() == 36


def test_unknown_coupon_is_refused():
    cart = Cart()
    with pytest.raises(ValueError, match="Unknown coupon"):
        cart.apply_coupon("FREE")
