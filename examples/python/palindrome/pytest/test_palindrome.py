import pytest
from palindrome import is_palindrome


# One test, run once per case: each case passes or fails on its own
@pytest.mark.parametrize("text, expected", [
    ("racecar", True),
    ("Racecar", True),
    ("Never odd or even", True),
    ("Was it a car or a cat I saw?", True),
    ("hello", False),
    ("palindrome", False),
])
def test_spots_a_palindrome(text, expected):
    assert is_palindrome(text) == expected
