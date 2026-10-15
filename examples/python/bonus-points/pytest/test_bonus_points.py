from bonus_points import points_for_order


def test_earns_whole_points():
    assert isinstance(points_for_order(), int)


# Flaky test: look closely at what the test expects.
def test_earns_points_for_an_order():
    assert points_for_order() == 10
