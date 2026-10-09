import unittest
from time_input import parse_time


class TimeInputTest(unittest.TestCase):
    # Bad: only the happy path
    def test_reads_a_time(self):
        self.assertEqual(parse_time("09:30"), 570)

    # Good: the unhappy paths and the edges too
    def test_an_empty_time_is_refused(self):
        with self.assertRaisesRegex(ValueError, "Time is required"):
            parse_time("  ")

    def test_a_time_without_a_colon_is_refused(self):
        with self.assertRaisesRegex(ValueError, "Use the form HH:MM"):
            parse_time("930")

    def test_letters_are_refused(self):
        with self.assertRaisesRegex(ValueError, "Use digits only"):
            parse_time("ab:cd")

    def test_hour_24_is_refused(self):
        with self.assertRaisesRegex(ValueError, "No such time"):
            parse_time("24:00")

    def test_minute_60_is_refused(self):
        with self.assertRaisesRegex(ValueError, "No such time"):
            parse_time("12:60")

    def test_midnight_is_0(self):
        minutes = parse_time("00:00")
        self.assertEqual(minutes, 0)

    def test_the_last_minute_of_the_day_is_1439(self):
        minutes = parse_time("23:59")
        self.assertEqual(minutes, 1439)


if __name__ == "__main__":
    unittest.main()
