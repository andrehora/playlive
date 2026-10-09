import unittest
from leap_year import is_leap


class LeapYearTest(unittest.TestCase):
    # Bad: a loop, and a formula of its own to work out the answer. The formula is
    # wrong (1900 was not a leap year), but none of the years it tries shows it
    def test_leap_years(self):
        for year in range(2000, 2030):
            self.assertEqual(is_leap(year), year % 4 == 0)

    # Good: the years and their answers, written out
    def test_a_year_divisible_by_4_is_leap(self):
        leap = is_leap(2024)
        self.assertTrue(leap)

    def test_other_years_are_not_leap(self):
        leap = is_leap(2023)
        self.assertFalse(leap)

    def test_a_century_is_not_leap(self):
        leap = is_leap(1900)
        self.assertFalse(leap)

    def test_every_400_years_a_century_is_leap(self):
        leap = is_leap(2000)
        self.assertTrue(leap)


if __name__ == "__main__":
    unittest.main()
