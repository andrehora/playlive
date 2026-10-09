import pytest
from tip_jar import TipJar


# Bad: it reads the private list, so storing tips another way breaks it
def test_tips_are_kept_in_a_list():
    jar = TipJar()
    jar.add(2)
    jar.add(3)
    assert jar._tips == [2, 3]


# Good: through add() and total(), as callers use it
def test_tips_add_up():
    jar = TipJar()
    jar.add(2)
    jar.add(3)
    assert jar.total() == 5


def test_an_empty_jar_holds_nothing():
    total = TipJar().total()
    assert total == 0


def test_a_tip_must_be_positive():
    jar = TipJar()
    with pytest.raises(ValueError, match="A tip must be positive"):
        jar.add(0)
