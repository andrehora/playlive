from coupon import make_coupon


def test_has_6_characters():
    assert len(make_coupon()) == 6


def test_contains_at_least_one_digit():
    assert any(char.isdigit() for char in make_coupon())
