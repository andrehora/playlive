from password_generator import generate_password


def test_is_8_characters_long():
    assert len(generate_password()) == 8


def test_contains_at_least_one_digit():
    assert any(char.isdigit() for char in generate_password())
