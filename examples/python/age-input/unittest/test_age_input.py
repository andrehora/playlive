import unittest
from age_input import parse_age


class AgeInputTest(unittest.TestCase):
    # Bad: only the happy path. Empty, words, negative and too high are never
    # tried, nor the boundary at 150
    def test_reads_an_age(self):
        self.assertEqual(parse_age("42"), 42)

    # Good: the unhappy paths and the boundary too
    def test_an_empty_age_is_refused(self):
        with self.assertRaisesRegex(ValueError, "Age is required"):
            parse_age("   ")

    def test_words_are_refused(self):
        with self.assertRaisesRegex(ValueError, "Age must be a whole number"):
            parse_age("forty")

    def test_a_negative_age_is_refused(self):
        with self.assertRaisesRegex(ValueError, "Age must be a whole number"):
            parse_age("-5")

    def test_150_is_the_highest_age(self):
        age = parse_age("150")
        self.assertEqual(age, 150)

    def test_151_is_refused(self):
        with self.assertRaisesRegex(ValueError, "Age is too high"):
            parse_age("151")


if __name__ == "__main__":
    unittest.main()
