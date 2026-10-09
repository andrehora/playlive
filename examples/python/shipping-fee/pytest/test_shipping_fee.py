from shipping_fee import shipping_fee


# Bad: it runs every line, so line coverage says 100%, yet it barely checks
# anything and takes only one way through each if (Branch: 2 of 4 branches)
def test_shipping_fee():
    assert shipping_fee(60, True) is not None


# Good: each way through each if, with the fee it should give
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
