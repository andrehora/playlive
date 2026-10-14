import pytest
from username import make_username, username_is_used, suggest


# Very bad: one test for everything. Its name does not say what broke
def test_username():
    assert make_username("Ana", "Souza") == "asouza"
    assert username_is_used("asouza", ["asouza"])
    assert suggest("asouza", ["asouza"]) == "asouza2"
    with pytest.raises(ValueError):
        make_username("", "Souza")


# Bad: one test per function. Its name says what it calls, not what it should do
def test_make_username():
    assert make_username("Ana", "Souza") == "asouza"


def test_username_is_used():
    assert username_is_used("asouza", ["asouza"])


def test_suggest():
    assert suggest("asouza", ["asouza"]) == "asouza2"


# Good: one test per behavior, named for what the code should do
def test_joins_the_first_initial_and_the_last_name():
    assert make_username("Ana", "Souza") == "asouza"


def test_removes_spaces_from_the_last_name():
    assert make_username("Ana", "da Silva") == "adasilva"


def test_refuses_a_missing_name():
    with pytest.raises(ValueError, match="First and last name are required"):
        make_username("", "Souza")


def test_finds_a_taken_username():
    assert username_is_used("asouza", ["bsilva", "asouza"])


def test_ignores_case_when_checking():
    assert username_is_used("ASouza", ["asouza"])


def test_keeps_a_free_username():
    assert suggest("asouza", ["bsilva"]) == "asouza"


def test_adds_2_to_a_taken_username():
    assert suggest("asouza", ["asouza"]) == "asouza2"


def test_counts_up_until_a_username_is_free():
    assert suggest("asouza", ["asouza", "asouza2"]) == "asouza3"
