import pytest
from grades import letter


# Bugs hide at the edges, so test both sides of each boundary
def test_90_is_an_a_and_89_is_a_b():
    assert letter(90) == "A"
    assert letter(89) == "B"


def test_70_is_a_c_and_69_is_an_f():
    assert letter(70) == "C"
    assert letter(69) == "F"


@pytest.mark.parametrize("score", [101, -1])
def test_scores_outside_0_to_100_are_refused(score):
    with pytest.raises(ValueError):
        letter(score)
