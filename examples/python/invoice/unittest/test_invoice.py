import unittest
from invoice import Invoice


# Dummy: passed in, but never used
DUMMY_MAILER = object()


class InvoiceTest(unittest.TestCase):
    def test_totals_the_prices(self):
        invoice = Invoice([3, 4.5], DUMMY_MAILER)
        self.assertEqual(invoice.total(), 7.5)

    def test_an_empty_invoice_totals_zero(self):
        invoice = Invoice([], DUMMY_MAILER)
        self.assertEqual(invoice.total(), 0)


if __name__ == "__main__":
    unittest.main()
