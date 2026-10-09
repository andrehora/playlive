import pytest
from raffle import draw


# Bad: it uses the real random, so each run draws someone else, and all it
# can check is that the winner entered
def test_draws_someone_who_entered():
    assert draw(["Ana", "Ben", "Cy"]) in ["Ana", "Ben", "Cy"]


# Good: draw is handed a fixed number instead of a random one (a seeded
# random.Random(42).random would do too), so every run draws the same name
def test_a_low_number_draws_the_first_name():
    winner = draw(["Ana", "Ben", "Cy"], rand=lambda: 0.0)
    assert winner == "Ana"


def test_a_high_number_draws_the_last_name():
    winner = draw(["Ana", "Ben", "Cy"], rand=lambda: 0.99)
    assert winner == "Cy"


def test_an_empty_raffle_is_refused():
    with pytest.raises(ValueError, match="No one entered"):
        draw([])
