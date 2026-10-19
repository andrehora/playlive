import calendar
import unittest


class CalendarTestCase(unittest.TestCase):
    def test_iterweekdays(self):
        week0 = list(range(7))
        for firstweekday in range(7):
            cal = calendar.Calendar(firstweekday)
            week = list(cal.iterweekdays())
            expected = week0[firstweekday:] + week0[:firstweekday]
            self.assertEqual(week, expected)
