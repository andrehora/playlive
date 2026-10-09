import pytest
from concert import Concert


# Bad: helpers hide the concert, so the test reads as bare numbers
def small_concert():
    return Concert(10, 20)


def buy_and_check(concert, count, cost, left):
    assert concert.buy(count) == cost
    assert concert.seats_left() == left


def test_buying():
    concert = small_concert()
    buy_and_check(concert, 2, 40, 8)
    buy_and_check(concert, 5, 90, 3)


# Good: each test shows the concert, what is bought, and the result
def test_tickets_cost_the_price_each():
    concert = Concert(capacity=10, price=20)
    cost = concert.buy(2)
    assert cost == 40


def test_5_tickets_or_more_get_10_percent_off():
    concert = Concert(capacity=10, price=20)
    cost = concert.buy(5)
    assert cost == 90


def test_bought_seats_are_gone():
    concert = Concert(capacity=10, price=20)
    concert.buy(4)
    assert concert.seats_left() == 6


def test_buying_more_than_are_left_is_refused():
    concert = Concert(capacity=3, price=20)
    with pytest.raises(ValueError, match="Not enough seats left"):
        concert.buy(4)


def test_buying_no_tickets_is_refused():
    concert = Concert(capacity=10, price=20)
    with pytest.raises(ValueError, match="Buy at least 1 ticket"):
        concert.buy(0)
