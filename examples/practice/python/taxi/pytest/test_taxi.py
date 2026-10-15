from taxi import pickup_minutes


def test_gives_whole_minutes():
    assert isinstance(pickup_minutes(3), int)


def test_takes_2_minutes_a_km():
    assert pickup_minutes(3) == 6
