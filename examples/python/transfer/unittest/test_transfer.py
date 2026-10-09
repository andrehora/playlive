import unittest
from unittest.mock import Mock
from transfer import Account


class TransferTest(unittest.TestCase):
    # Bad: it checks that deposit was called, not that the money arrived, so moving
    # it another way breaks the test though both balances come out the same
    def test_transfer_calls_deposit(self):
        to = Mock()
        Account(100).transfer(to, 30)
        to.deposit.assert_called_once_with(30)

    # Good: it checks the balances, the result anyone would look at
    def test_the_money_arrives(self):
        ana, ben = Account(100), Account(0)
        ana.transfer(ben, 30)
        self.assertEqual(ben.balance, 30)

    def test_the_money_leaves(self):
        ana, ben = Account(100), Account(0)
        ana.transfer(ben, 30)
        self.assertEqual(ana.balance, 70)

    def test_a_refused_transfer_moves_nothing(self):
        ana, ben = Account(10), Account(0)
        with self.assertRaisesRegex(ValueError, "Not enough money"):
            ana.transfer(ben, 30)
        self.assertEqual(ben.balance, 0)


if __name__ == "__main__":
    unittest.main()
