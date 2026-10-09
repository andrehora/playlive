import unittest
from password_rules import strength


class PasswordRulesTest(unittest.TestCase):
    # Bad: it runs every line and every branch, so coverage is 100%, but it checks
    # only one of the three answers. The Mutation tab shows what slips through
    def test_strength(self):
        strength("abc")
        strength("abcdefgh")
        self.assertEqual(strength("abcdefgh1"), "strong")

    # Good: every answer checked
    def test_short_passwords_are_weak(self):
        rating = strength("abc")
        self.assertEqual(rating, "weak")

    def test_long_passwords_of_letters_only_are_medium(self):
        rating = strength("abcdefgh")
        self.assertEqual(rating, "medium")

    def test_long_passwords_with_a_digit_are_strong(self):
        rating = strength("abcdefgh1")
        self.assertEqual(rating, "strong")


if __name__ == "__main__":
    unittest.main()
