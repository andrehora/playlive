import calendar
import unittest
import time


class TimegmTestCase(unittest.TestCase):
    TIMESTAMPS = [0, 10, 100, 1000, 10000, 100000, 1000000,
                  1234567890, 1262304000, 1275785153,]

    def test_timegm(self):
        for secs in self.TIMESTAMPS:
            tuple = time.gmtime(secs)
            self.assertEqual(secs, calendar.timegm(tuple))
