import pytest
from loyalty_points import loyalty_points


# Bad: each if goes only one way, and "> 0" checks almost nothing
def test_points_for_a_member_on_their_birthday():
    assert loyalty_points(300, True, True) > 0


# Good: each way through each if, with its points
def test_a_euro_earns_a_point():
    points = loyalty_points(40, False, False)
    assert points == 40


def test_members_earn_double():
    points = loyalty_points(40, True, False)
    assert points == 80


def test_a_birthday_adds_50():
    points = loyalty_points(40, False, True)
    assert points == 90


def test_points_stop_at_500():
    points = loyalty_points(300, True, False)
    assert points == 500


def test_a_negative_amount_is_refused():
    with pytest.raises(ValueError, match="Amount cannot be negative"):
        loyalty_points(-1, False, False)
