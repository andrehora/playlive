from shipping_fee import shipping_fee


# Bad: every line runs, but each if goes one way and the fee is not checked
def test_shipping_fee():
    assert shipping_fee(60, True) is not None


# Good: each way through each if, with its fee
def test_small_orders_pay_5():
    fee = shipping_fee(40, False)
    assert fee == 5


def test_orders_of_50_or_more_ship_free():
    fee = shipping_fee(50, False)
    assert fee == 0


def test_express_adds_10():
    fee = shipping_fee(40, True)
    assert fee == 15


def test_express_still_costs_10_when_shipping_is_free():
    fee = shipping_fee(60, True)
    assert fee == 10
