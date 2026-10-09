import unittest
from shipping_fee import shipping_fee


class ShippingFeeTest(unittest.TestCase):
    # Bad: every line runs, but each if goes one way and the fee is not checked
    def test_shipping_fee(self):
        self.assertIsNotNone(shipping_fee(60, True))

    # Good: each way through each if, with its fee
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
