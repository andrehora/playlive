import pytest
from bus_fare import fare


def test_children_pay_half():
    assert fare(8) == 1


def test_adults_pay_full_fare():
    assert fare(30) == 2


# Not built yet: skipped, so it does not run
@pytest.mark.skip(reason="free travel for seniors is not built yet")
def test_seniors_travel_free():
    assert fare(70) == 0
