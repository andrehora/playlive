import calendar
import unittest


class OutputTestCase(unittest.TestCase):
    def test_formatmonthname_with_year(self):
        self.assertEqual(
            calendar.HTMLCalendar().formatmonthname(2004, 1, withyear=True),
            '<tr><th colspan="7" class="month">January 2004</th></tr>'
        )

    def test_formatmonthname_without_year(self):
        self.assertEqual(
            calendar.HTMLCalendar().formatmonthname(2004, 1, withyear=False),
            '<tr><th colspan="7" class="month">January</th></tr>'
        )
