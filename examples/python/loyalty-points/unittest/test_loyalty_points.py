import unittest
from loyalty_points import loyalty_points


class LoyaltyPointsTest(unittest.TestCase):
    # Bad: each if goes only one way, and "> 0" checks almost nothing
    def test_points_for_a_member_on_their_birthday(self):
        self.assertGreater(loyalty_points(300, True, True), 0)

    # Good: each way through each if, with its points
    def test_a_euro_earns_a_point(self):
        points = loyalty_points(40, False, False)
        self.assertEqual(points, 40)

    def test_members_earn_double(self):
        points = loyalty_points(40, True, False)
        self.assertEqual(points, 80)

    def test_a_birthday_adds_50(self):
        points = loyalty_points(40, False, True)
        self.assertEqual(points, 90)

    def test_points_stop_at_500(self):
        points = loyalty_points(300, True, False)
        self.assertEqual(points, 500)

    def test_a_negative_amount_is_refused(self):
        with self.assertRaisesRegex(ValueError, "Amount cannot be negative"):
            loyalty_points(-1, False, False)


if __name__ == "__main__":
    unittest.main()
