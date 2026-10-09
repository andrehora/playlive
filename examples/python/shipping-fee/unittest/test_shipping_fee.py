import unittest
from shipping_fee import shipping_fee


class ShippingFeeTest(unittest.TestCase):
    # Bad: it runs every line, so line coverage says 100%, yet it barely checks
    # anything and takes only one way through each if (Branch: 2 of 4 branches)
    def test_shipping_fee(self):
        self.assertIsNotNone(shipping_fee(60, True))

    # Good: each way through each if, with the fee it should give
    def test_small_orders_pay_5(self):
        fee = shipping_fee(40, False)
        self.assertEqual(fee, 5)

    def test_orders_of_50_or_more_ship_free(self):
        fee = shipping_fee(50, False)
        self.assertEqual(fee, 0)

    def test_express_adds_10(self):
        fee = shipping_fee(40, True)
        self.assertEqual(fee, 15)

    def test_express_still_costs_10_when_shipping_is_free(self):
        fee = shipping_fee(60, True)
        self.assertEqual(fee, 10)


if __name__ == "__main__":
    unittest.main()
