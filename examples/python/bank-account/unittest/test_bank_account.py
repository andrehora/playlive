import unittest
from bank_account import Account, InsufficientFunds


class AccountTest(unittest.TestCase):
    def test_deposit_adds_to_the_balance(self):
        account = Account(100)
        account.deposit(50)
        self.assertEqual(account.balance, 150)

    def test_withdrawing_too_much_is_refused(self):
        account = Account(100)
        with self.assertRaises(InsufficientFunds):
            account.withdraw(150)

    def test_a_refused_withdrawal_leaves_the_balance_alone(self):
        account = Account(100)
        try:
            account.withdraw(150)
        except InsufficientFunds:
            pass
        self.assertEqual(account.balance, 100)


if __name__ == "__main__":
    unittest.main()
