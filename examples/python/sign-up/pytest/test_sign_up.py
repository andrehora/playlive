import pytest
from unittest.mock import Mock
from sign_up import SignUp


# Fake: users kept in a list
class FakeUsers:
    def __init__(self):
        self.emails = []

    def exists(self, email):
        return email in self.emails

    def save(self, email):
        self.emails.append(email)


# Bad: a mock only knows what it was told
def test_registers_a_new_email():
    users = Mock()
    users.exists.return_value = False
    assert SignUp(users).register("ana@example.test") == "Welcome, ana@example.test"
    users.save.assert_called_once_with("ana@example.test")


# Good: the fake
def test_a_new_email_is_welcomed():
    sign_up = SignUp(FakeUsers())
    message = sign_up.register("ana@example.test")
    assert message == "Welcome, ana@example.test"


def test_an_email_can_register_only_once():
    sign_up = SignUp(FakeUsers())
    sign_up.register("ana@example.test")
    with pytest.raises(ValueError, match="Email already registered"):
        sign_up.register("ana@example.test")
