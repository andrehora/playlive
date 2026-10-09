from password_rules import strength


# Bad: 100% coverage, but it checks only one of the three answers
def test_strength():
    strength("abc")
    strength("abcdefgh")
    assert strength("abcdefgh1") == "strong"


# Good: every answer checked
def test_short_passwords_are_weak():
    rating = strength("abc")
    assert rating == "weak"


def test_long_passwords_of_letters_only_are_medium():
    rating = strength("abcdefgh")
    assert rating == "medium"


def test_long_passwords_with_a_digit_are_strong():
    rating = strength("abcdefgh1")
    assert rating == "strong"
