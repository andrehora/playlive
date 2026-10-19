import calendar
import unittest


class CalendarTestCase(unittest.TestCase):
    def test_deprecation_warning(self):
        with self.assertWarnsRegex(
            DeprecationWarning,
            "The 'January' attribute is deprecated, use 'JANUARY' instead"
        ):
            calendar.January
