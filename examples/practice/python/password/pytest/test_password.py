from password import make_password


def test_has_only_letters_and_digits():
    assert make_password().isalnum()


def test_has_8_to_10_characters():
    assert len(make_password()) in range(8, 10)
