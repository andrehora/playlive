import pytest
from unittest.mock import Mock
from payment import Payments, checkout


# Bad: it mocks PayCo, which is not ours, so PayCo's changes break it
def test_checkout_charges_payco():
    payco = Mock()
    payco.create_charge.return_value = {"status": "succeeded"}
    assert checkout(20, Payments(payco)) == "Paid"
    payco.create_charge.assert_called_once_with({"amount_cents": 2000, "currency": "EUR"})


# Good: it mocks Payments, our own wrapper around PayCo
def test_a_paid_charge_says_paid():
    payments = Mock()
    payments.charge.return_value = True
    status = checkout(20, payments)
    assert status == "Paid"


def test_a_declined_charge_says_declined():
    payments = Mock()
    payments.charge.return_value = False
    status = checkout(20, payments)
    assert status == "Declined"


def test_nothing_to_pay_is_refused():
    with pytest.raises(ValueError, match="Nothing to pay"):
        checkout(0, Mock())
