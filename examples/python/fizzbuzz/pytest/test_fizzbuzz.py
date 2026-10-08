import pytest
from fizzbuzz import fizzbuzz


# One test, run once per case: each case passes or fails on its own
@pytest.mark.parametrize("n, expected", [
    (1, "1"),
    (3, "Fizz"),
    (5, "Buzz"),
    (15, "FizzBuzz"),
    (98, "98"),
])
def test_each_rule(n, expected):
    assert fizzbuzz(n) == expected
