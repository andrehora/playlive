import pytest
from anagram import is_anagram


# One test, run once per case: each case passes or fails on its own
@pytest.mark.parametrize("first, second, expected", [
    ("listen", "silent", True),
    ("Listen", "Silent", True),
    ("Dormitory", "Dirty room", True),
    ("The eyes", "They see!", True),
    ("hello", "world", False),
])
def test_spots_an_anagram(first, second, expected):
    assert is_anagram(first, second) == expected
