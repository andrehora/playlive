from dice import roll


def test_rolls_a_whole_number():
    assert isinstance(roll(), int)


def test_rolls_from_1_to_6():
    assert roll() in range(1, 6)
