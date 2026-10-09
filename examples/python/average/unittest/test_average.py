import io
import unittest
from contextlib import redirect_stdout
from average import average, print_average


class AverageTest(unittest.TestCase):
    # Bad: it tests through print, so any change to the wording breaks it
    def test_prints_the_average(self):
        out = io.StringIO()
        with redirect_stdout(out):
            print_average([6, 9])
        self.assertEqual(out.getvalue(), "Average: 7.5\n")

    # Good: average returns its result, so the tests just compare
    def test_averages_the_scores(self):
        mean = average([6, 9])
        self.assertEqual(mean, 7.5)

    def test_no_scores_average_zero(self):
        mean = average([])
        self.assertEqual(mean, 0)


if __name__ == "__main__":
    unittest.main()
