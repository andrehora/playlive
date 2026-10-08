import pytest
from bank_account import Account, InsufficientFunds


def test_deposit_adds_to_the_balance():
    account = Account(100)
    account.deposit(50)
    assert account.balance == 150


def test_withdrawing_too_much_is_refused():
    account = Account(100)
    with pytest.raises(InsufficientFunds):
        account.withdraw(150)


def test_a_refused_withdrawal_leaves_the_balance_alone():
    account = Account(100)
    with pytest.raises(InsufficientFunds):
        account.withdraw(150)
    assert account.balance == 100
