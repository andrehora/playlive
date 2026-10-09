import pytest
from grades import letter


# Bugs hide at the edges, so test both sides of each boundary
def test_90_is_an_a_and_89_is_a_b():
    assert letter(90) == "A"
    assert letter(89) == "B"


def test_70_is_a_c_and_69_is_an_f():
    assert letter(70) == "C"
    assert letter(69) == "F"


def test_101_is_refused():
    with pytest.raises(ValueError):
        letter(101)


def test_minus_1_is_refused():
    with pytest.raises(ValueError):
        letter(-1)
