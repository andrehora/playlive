from invoice import Invoice


# Dummy: passed in, but never used
DUMMY_MAILER = object()


def test_totals_the_prices():
    invoice = Invoice([3, 4.5], DUMMY_MAILER)
    assert invoice.total() == 7.5


def test_an_empty_invoice_totals_zero():
    invoice = Invoice([], DUMMY_MAILER)
    assert invoice.total() == 0
