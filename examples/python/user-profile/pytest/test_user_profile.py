import pytest
from user_profile import make_profile


# Bad: it compares the whole profile, so a new field breaks it
def test_makes_the_whole_profile():
    assert make_profile("Ana", "ana@example.test") == {"name": "Ana", "email": "ana@example.test"}


# Good: each test checks only what it is about
def test_the_name_is_trimmed():
    name = make_profile("  Ana ", "ana@example.test")["name"]
    assert name == "Ana"


def test_the_email_is_lowercased():
    email = make_profile("Ana", "Ana@Example.TEST")["email"]
    assert email == "ana@example.test"


def test_a_blank_name_is_refused():
    with pytest.raises(ValueError, match="Name is required"):
        make_profile("   ", "ana@example.test")
