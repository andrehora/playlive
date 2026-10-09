import pytest
from unittest.mock import Mock
import order_confirmation as shop


# Bad: it mocks total, our own pricing rule, so the rule is never tested. One
# 20 item with the coupon costs 10, yet the order says 50
def test_an_order_is_charged(monkeypatch):
    monkeypatch.setattr(shop, "total", lambda items, coupon: 50)
    gateway, mailer = Mock(), Mock()
    assert shop.place_order("ana@example.test", [(20, 1)], "SAVE10", gateway, mailer) == 50


# Good: only the gateway and the mailer, the boundaries, are mocked; the
# pricing runs for real
def test_the_card_is_charged_the_total():
    gateway, mailer = Mock(), Mock()
    shop.place_order("ana@example.test", [(20, 2), (5, 1)], "", gateway, mailer)
    gateway.charge.assert_called_once_with(45)


def test_the_coupon_takes_10_off():
    gateway, mailer = Mock(), Mock()
    amount = shop.place_order("ana@example.test", [(20, 2), (5, 1)], "SAVE10", gateway, mailer)
    assert amount == 35


def test_a_confirmation_is_emailed():
    gateway, mailer = Mock(), Mock()
    shop.place_order("ana@example.test", [(20, 2), (5, 1)], "", gateway, mailer)
    mailer.send.assert_called_once_with("ana@example.test", "Order confirmed: 45")


def test_nothing_to_pay_charges_nothing():
    gateway, mailer = Mock(), Mock()
    with pytest.raises(ValueError, match="Nothing to pay"):
        shop.place_order("ana@example.test", [(10, 1)], "SAVE10", gateway, mailer)
    gateway.charge.assert_not_called()
