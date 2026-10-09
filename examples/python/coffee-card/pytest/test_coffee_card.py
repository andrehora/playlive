from coffee_card import CoffeeCard


# Bad: one test holds every behavior. Its name doesn't say which broke
def test_buy():
    card = CoffeeCard()
    assert card.buy(3) == 3
    assert card.stamps == 1
    for _ in range(8):
        card.buy(3)
    assert card.buy(3) == 0
    assert card.stamps == 0


# Good: one test per behavior, named for what it does
def test_a_coffee_costs_its_price():
    card = CoffeeCard()
    price = card.buy(3)
    assert price == 3


def test_each_coffee_earns_a_stamp():
    card = CoffeeCard(stamps=4)
    card.buy(3)
    assert card.stamps == 5


def test_the_tenth_coffee_is_free():
    card = CoffeeCard(stamps=9)
    price = card.buy(3)
    assert price == 0


def test_a_free_coffee_starts_a_new_card():
    card = CoffeeCard(stamps=9)
    card.buy(3)
    assert card.stamps == 0
