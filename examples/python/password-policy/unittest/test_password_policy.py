import unittest
from password_policy import PasswordPolicy


class PasswordPolicyTest(unittest.TestCase):
    # Bad: it calls a private method, so inlining it breaks the test
    def test_has_digit_finds_a_digit(self):
        policy = PasswordPolicy()
        self.assertTrue(policy._has_digit("abc1"))
        self.assertFalse(policy._has_digit("abc"))

    # Good: through problems() and is_valid(), as callers use them
    def test_a_good_password_is_valid(self):
        policy = PasswordPolicy()
        valid = policy.is_valid("Secret123")
        self.assertTrue(valid)

    def test_a_short_password_is_too_short(self):
        policy = PasswordPolicy()
        problems = policy.problems("Sec1")
        self.assertIn("too short", problems)

    def test_a_password_needs_a_digit(self):
        policy = PasswordPolicy()
        problems = policy.problems("Secretpass")
        self.assertIn("no digit", problems)

    def test_a_password_needs_a_capital(self):
        policy = PasswordPolicy()
        problems = policy.problems("secret123")
        self.assertIn("no capital", problems)

    def test_the_minimum_length_can_be_changed(self):
        policy = PasswordPolicy(min_length=4)
        valid = policy.is_valid("Ab12")
        self.assertTrue(valid)


if __name__ == "__main__":
    unittest.main()
