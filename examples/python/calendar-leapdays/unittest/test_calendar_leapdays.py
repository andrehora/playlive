import calendar
import unittest


class LeapdaysTestCase(unittest.TestCase):
    def test_no_range(self):
        # test when no range i.e. two identical years as args
        self.assertEqual(calendar.leapdays(2010,2010), 0)

    def test_no_leapdays(self):
        # test when no leap years in range
        self.assertEqual(calendar.leapdays(2010,2011), 0)

    def test_no_leapdays_upper_boundary(self):
        # test no leap years in range, when upper boundary is a leap year
        self.assertEqual(calendar.leapdays(2010,2012), 0)

    def test_one_leapday_lower_boundary(self):
        # test when one leap year in range, lower boundary is leap year
        self.assertEqual(calendar.leapdays(2012,2013), 1)

    def test_several_leapyears_in_range(self):
        self.assertEqual(calendar.leapdays(1997,2020), 5)
