import unittest
from rainfall import total, average


class RainfallTest(unittest.TestCase):
    # 0.1 + 0.2 is 0.30000000000000004, so an exact check would fail
    def test_totals_the_rainfall(self):
        self.assertAlmostEqual(total([0.1, 0.2]), 0.3)

    # 0.7 / 3 never ends, so the test says how close is enough
    def test_averages_the_rainfall(self):
        self.assertAlmostEqual(average([0.1, 0.2, 0.4]), 0.233, delta=0.001)


if __name__ == "__main__":
    unittest.main()
