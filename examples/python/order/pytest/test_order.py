from order import Order


# Bad: it calls a private method, so renaming _subtotal breaks it
def test_subtotal_adds_the_prices():
    order = Order([20, 15])
    assert order._subtotal() == 35


# Good: through total(), as callers use it
def test_orders_under_50_pay_5_for_shipping():
    order = Order([20, 15])
    total = order.total()
    assert total == 40


def test_orders_of_50_or_more_ship_free():
    order = Order([30, 20])
    total = order.total()
    assert total == 50
