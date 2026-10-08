from password_check import is_strong


def test_long_with_a_digit_and_a_capital_is_strong():
    assert is_strong("Sunflower7")


def test_short_password_is_weak():
    assert not is_strong("Sun7")


def test_password_without_a_digit_is_weak():
    assert not is_strong("Sunflowers")


def test_password_without_a_capital_is_weak():
    assert not is_strong("sunflower7")
