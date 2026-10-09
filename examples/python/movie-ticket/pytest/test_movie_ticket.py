from movie_ticket import ticket_price


# Bad: a table and a helper, so the test says nothing by itself
CASES = [(8, "Friday", 5), (30, "Tuesday", 6), (30, "Friday", 10)]


def check(i):
    age, day, price = CASES[i]
    assert ticket_price(age, day) == price


def test_prices():
    check(0)
    check(1)
    check(2)


# Good: each test says who goes, when, and what they pay
def test_children_under_12_pay_5():
    price = ticket_price(8, "Friday")
    assert price == 5


def test_a_12_year_old_pays_full_price():
    price = ticket_price(12, "Friday")
    assert price == 10


def test_tuesdays_cost_6():
    price = ticket_price(30, "Tuesday")
    assert price == 6


def test_adults_pay_10():
    price = ticket_price(30, "Friday")
    assert price == 10
