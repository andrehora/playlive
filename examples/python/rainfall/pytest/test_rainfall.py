import pytest
from rainfall import total, average


# 0.1 + 0.2 is 0.30000000000000004, so an exact check would fail
def test_totals_the_rainfall():
    assert total([0.1, 0.2]) == pytest.approx(0.3)


# 0.7 / 3 never ends, so the test says how close is enough
def test_averages_the_rainfall():
    assert average([0.1, 0.2, 0.4]) == pytest.approx(0.233, abs=0.001)
