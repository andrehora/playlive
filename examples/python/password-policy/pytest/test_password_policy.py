from password_policy import PasswordPolicy


# Bad: it calls a private method, so inlining _has_digit breaks it, though
# problems() and is_valid() still work
def test_has_digit_finds_a_digit():
    policy = PasswordPolicy()
    assert policy._has_digit("abc1") is True
    assert policy._has_digit("abc") is False


# Good: through problems() and is_valid(), as callers use them
def test_a_good_password_is_valid():
    policy = PasswordPolicy()
    valid = policy.is_valid("Secret123")
    assert valid is True


def test_a_short_password_is_too_short():
    policy = PasswordPolicy()
    problems = policy.problems("Sec1")
    assert "too short" in problems


def test_a_password_needs_a_digit():
    policy = PasswordPolicy()
    problems = policy.problems("Secretpass")
    assert "no digit" in problems


def test_a_password_needs_a_capital():
    policy = PasswordPolicy()
    problems = policy.problems("secret123")
    assert "no capital" in problems


def test_the_minimum_length_can_be_changed():
    policy = PasswordPolicy(min_length=4)
    valid = policy.is_valid("Ab12")
    assert valid is True
