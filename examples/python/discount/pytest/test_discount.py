from discount import discounted


# Bad: a loop with an if, so only the prices the if lets through are checked.
# 50 and 100 never are, and the boundary at 100 goes untested
def test_discounts():
    for price in [50, 100, 150]:
        if price > 100:
            assert discounted(price) == price * 90 / 100


# Good: each price and what it should cost, written out
def test_under_100_pays_full_price():
    price = discounted(50)
    assert price == 50


def test_100_gets_10_percent_off():
    price = discounted(100)
    assert price == 90


def test_150_gets_10_percent_off():
    price = discounted(150)
    assert price == 135
