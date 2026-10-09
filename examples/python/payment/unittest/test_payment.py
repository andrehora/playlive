import unittest
from unittest.mock import Mock
from payment import Payments, checkout


class PaymentTest(unittest.TestCase):
    # Bad: it mocks PayCo, which is not ours, so PayCo's changes break it
    def test_checkout_charges_payco(self):
        payco = Mock()
        payco.create_charge.return_value = {"status": "succeeded"}
        self.assertEqual(checkout(20, Payments(payco)), "Paid")
        payco.create_charge.assert_called_once_with({"amount_cents": 2000, "currency": "EUR"})

    # Good: it mocks Payments, our own wrapper around PayCo
    def test_a_paid_charge_says_paid(self):
        payments = Mock()
        payments.charge.return_value = True
        status = checkout(20, payments)
        self.assertEqual(status, "Paid")

    def test_a_declined_charge_says_declined(self):
        payments = Mock()
        payments.charge.return_value = False
        status = checkout(20, payments)
        self.assertEqual(status, "Declined")

    def test_nothing_to_pay_is_refused(self):
        with self.assertRaisesRegex(ValueError, "Nothing to pay"):
            checkout(0, Mock())


if __name__ == "__main__":
    unittest.main()
