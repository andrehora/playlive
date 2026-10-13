import pytest
import requests
from currency_api import Currency


# Past rates never change, so the tests can name them
@pytest.fixture
def currency():
    return Currency()


def test_gets_the_rate_of_a_day(currency):
    assert currency.rate("2024-01-02", "EUR", "USD") == 1.0956


def test_converts_an_amount(currency):
    assert currency.convert("2024-01-02", 100, "USD", "EUR") == 91.27


def test_a_weekend_uses_the_friday_before(currency):
    assert currency.rate("2024-01-06", "EUR", "USD") == currency.rate("2024-01-05", "EUR", "USD")


def test_refuses_an_unknown_currency(currency):
    with pytest.raises(requests.HTTPError):
        currency.rate("2024-01-02", "EUR", "XXX")
