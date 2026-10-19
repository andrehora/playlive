import calendar
import unittest


class CalendarTestCase(unittest.TestCase):
    def test_setfirstweekday(self):
        self.assertRaises(TypeError, calendar.setfirstweekday, 'flabber')
        self.assertRaises(ValueError, calendar.setfirstweekday, -1)
        self.assertRaises(ValueError, calendar.setfirstweekday, 200)
        orig = calendar.firstweekday()
        calendar.setfirstweekday(calendar.SUNDAY)
        self.assertEqual(calendar.firstweekday(), calendar.SUNDAY)
        calendar.setfirstweekday(calendar.MONDAY)
        self.assertEqual(calendar.firstweekday(), calendar.MONDAY)
        calendar.setfirstweekday(orig)

    def test_illegal_weekday_reported(self):
        with self.assertRaisesRegex(calendar.IllegalWeekdayError, '123'):
            calendar.setfirstweekday(123)
