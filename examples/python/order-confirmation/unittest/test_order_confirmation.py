import unittest
from unittest.mock import Mock, patch
import order_confirmation as shop


class OrderConfirmationTest(unittest.TestCase):
    # Bad: it mocks total, our own pricing rule, so the rule is never tested. One
    # 20 item with the coupon costs 10, yet the order says 50
    def test_an_order_is_charged(self):
        with patch("order_confirmation.total", return_value=50):
            gateway, mailer = Mock(), Mock()
            self.assertEqual(shop.place_order("ana@example.test", [(20, 1)], "SAVE10", gateway, mailer), 50)

    # Good: only the gateway and the mailer, the boundaries, are mocked; the
    # pricing runs for real
    def test_the_card_is_charged_the_total(self):
        gateway, mailer = Mock(), Mock()
        shop.place_order("ana@example.test", [(20, 2), (5, 1)], "", gateway, mailer)
        gateway.charge.assert_called_once_with(45)

    def test_the_coupon_takes_10_off(self):
        gateway, mailer = Mock(), Mock()
        amount = shop.place_order("ana@example.test", [(20, 2), (5, 1)], "SAVE10", gateway, mailer)
        self.assertEqual(amount, 35)

    def test_a_confirmation_is_emailed(self):
        gateway, mailer = Mock(), Mock()
        shop.place_order("ana@example.test", [(20, 2), (5, 1)], "", gateway, mailer)
        mailer.send.assert_called_once_with("ana@example.test", "Order confirmed: 45")

    def test_nothing_to_pay_charges_nothing(self):
        gateway, mailer = Mock(), Mock()
        with self.assertRaisesRegex(ValueError, "Nothing to pay"):
            shop.place_order("ana@example.test", [(10, 1)], "SAVE10", gateway, mailer)
        gateway.charge.assert_not_called()


if __name__ == "__main__":
    unittest.main()
