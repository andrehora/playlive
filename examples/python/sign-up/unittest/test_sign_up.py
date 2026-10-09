import unittest
from unittest.mock import Mock
from sign_up import SignUp


# Good: a fake, users kept in a list. As cheap as a mock, and it behaves
class FakeUsers:
    def __init__(self):
        self.emails = []

    def exists(self, email):
        return email in self.emails

    def save(self, email):
        self.emails.append(email)


class SignUpTest(unittest.TestCase):
    # Bad: a mock told what exists returns. It only knows what it was told, so it
    # cannot notice save and exists disagreeing, and each test must tell it again
    def test_registers_a_new_email(self):
        users = Mock()
        users.exists.return_value = False
        self.assertEqual(SignUp(users).register("ana@example.test"), "Welcome, ana@example.test")
        users.save.assert_called_once_with("ana@example.test")

    # Good: the fake
    def test_a_new_email_is_welcomed(self):
        sign_up = SignUp(FakeUsers())
        message = sign_up.register("ana@example.test")
        self.assertEqual(message, "Welcome, ana@example.test")

    def test_an_email_can_register_only_once(self):
        sign_up = SignUp(FakeUsers())
        sign_up.register("ana@example.test")
        with self.assertRaisesRegex(ValueError, "Email already registered"):
            sign_up.register("ana@example.test")


if __name__ == "__main__":
    unittest.main()
