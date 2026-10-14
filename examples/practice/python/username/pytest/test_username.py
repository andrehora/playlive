import pytest
from username import make_username, username_is_used, suggest


def test_joins_the_first_initial_and_the_last_name():
    assert make_username("Ana", "Souza") == "asouza"
