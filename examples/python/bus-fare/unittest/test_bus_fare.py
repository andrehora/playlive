import unittest
from bus_fare import fare


class BusFareTest(unittest.TestCase):
    def test_children_pay_half(self):
        self.assertEqual(fare(8), 1)

    def test_adults_pay_full_fare(self):
        self.assertEqual(fare(30), 2)

    # Not built yet: skipped, so it does not run
    @unittest.skip("free travel for seniors is not built yet")
    def test_seniors_travel_free(self):
        self.assertEqual(fare(70), 0)


if __name__ == "__main__":
    unittest.main()
