import pytest
from calculator import add, subtract, multiply, divide


# Very bad: one test for everything. Its name does not say what broke
def test_calculator():
    assert add(2, 3) == 5
    assert subtract(10, 4) == 6
    assert multiply(3, 4) == 12
    assert divide(10, 4) == 2.5
    assert divide(10, 2) == 5
    with pytest.raises(ValueError):
        divide(1, 0)


# Bad: one test per function. Its name says what it calls, not what it should do
def test_add():
    assert add(2, 3) == 5


def test_subtract():
    assert subtract(10, 4) == 6


def test_multiply():
    assert multiply(3, 4) == 12


def test_divide():
    assert divide(10, 4) == 2.5


# Good: one test per behavior, named for what the code should do
def test_adds_two_numbers():
    assert add(2, 3) == 5


def test_adds_negative_numbers():
    assert add(-2, -3) == -5


def test_subtracts_two_numbers():
    assert subtract(10, 4) == 6


def test_multiplies_two_numbers():
    assert multiply(3, 4) == 12


def test_divides_into_a_decimal():
    assert divide(10, 4) == 2.5


def test_divides_into_an_integer():
    assert divide(10, 2) == 5


def test_refuses_to_divide_by_zero():
    with pytest.raises(ValueError, match="Cannot divide by zero"):
        divide(1, 0)
