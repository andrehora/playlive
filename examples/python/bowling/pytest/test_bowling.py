from bowling import score


# Bad: one test for the function, holding five behaviors. When it fails, its
# name doesn't say which rule broke
def test_score():
    assert score([0] * 20) == 0
    assert score([1] * 20) == 20
    assert score([5, 5, 3] + [0] * 17) == 16
    assert score([10, 3, 4] + [0] * 16) == 24
    assert score([10] * 12) == 300


# Good: one test per behavior, named for the rule it checks
def test_a_gutter_game_scores_0():
    total = score([0] * 20)
    assert total == 0


def test_without_spares_or_strikes_the_pins_add_up():
    total = score([1] * 20)
    assert total == 20


def test_a_spare_adds_the_next_roll():
    total = score([5, 5, 3] + [0] * 17)
    assert total == 16


def test_a_strike_adds_the_next_two_rolls():
    total = score([10, 3, 4] + [0] * 16)
    assert total == 24


def test_a_perfect_game_scores_300():
    total = score([10] * 12)
    assert total == 300
