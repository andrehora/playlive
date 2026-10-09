import pytest
from age_input import parse_age


# Bad: only the happy path
def test_reads_an_age():
    assert parse_age("42") == 42


# Good: the unhappy paths and the boundary too
def test_an_empty_age_is_refused():
    with pytest.raises(ValueError, match="Age is required"):
        parse_age("   ")


def test_words_are_refused():
    with pytest.raises(ValueError, match="Age must be a whole number"):
        parse_age("forty")


def test_a_negative_age_is_refused():
    with pytest.raises(ValueError, match="Age must be a whole number"):
        parse_age("-5")


def test_150_is_the_highest_age():
    age = parse_age("150")
    assert age == 150


def test_151_is_refused():
    with pytest.raises(ValueError, match="Age is too high"):
        parse_age("151")
