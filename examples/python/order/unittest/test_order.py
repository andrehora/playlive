import unittest
from order import Order


class OrderTest(unittest.TestCase):
    # Bad: it calls a private method, so renaming _subtotal breaks it
    def test_subtotal_adds_the_prices(self):
        order = Order([20, 15])
        self.assertEqual(order._subtotal(), 35)

    # Good: through total(), as callers use it
    def test_orders_under_50_pay_5_for_shipping(self):
        order = Order([20, 15])
        total = order.total()
        self.assertEqual(total, 40)

    def test_orders_of_50_or_more_ship_free(self):
        order = Order([30, 20])
        total = order.total()
        self.assertEqual(total, 50)


if __name__ == "__main__":
    unittest.main()
