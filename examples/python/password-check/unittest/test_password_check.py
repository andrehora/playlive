import unittest
from password_check import is_strong


class PasswordCheckTest(unittest.TestCase):
    def test_long_with_a_digit_and_a_capital_is_strong(self):
        self.assertTrue(is_strong("Sunflower7"))

    def test_short_password_is_weak(self):
        self.assertFalse(is_strong("Sun7"))

    def test_password_without_a_digit_is_weak(self):
        self.assertFalse(is_strong("Sunflowers"))

    def test_password_without_a_capital_is_weak(self):
        self.assertFalse(is_strong("sunflower7"))


if __name__ == "__main__":
    unittest.main()
