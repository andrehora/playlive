from pin_code import is_valid_pin


def test_four_different_digits_are_a_valid_pin():
    assert is_valid_pin("4831")


def test_a_short_pin_is_invalid():
    assert not is_valid_pin("483")


def test_a_pin_with_letters_is_invalid():
    assert not is_valid_pin("48a1")


def test_a_pin_of_one_repeated_digit_is_invalid():
    assert not is_valid_pin("1111")
