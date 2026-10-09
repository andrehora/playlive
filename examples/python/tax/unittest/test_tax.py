import unittest
from unittest.mock import Mock
from tax import Tax, total_with_tax


class TaxTest(unittest.TestCase):
    # Bad: a mock Tax, so Tax never runs, and the test pins how it is called
    def test_tax_is_asked_once_for_the_total(self):
        tax = Mock()
        tax.on.return_value = 6
        self.assertEqual(total_with_tax([10, 20], tax), 36)
        tax.on.assert_called_once_with(30)

    # Good: a real Tax, which costs nothing to make
    def test_tax_is_added_to_the_total(self):
        tax = Tax(20)
        total = total_with_tax([10, 20], tax)
        self.assertEqual(total, 36)

    def test_no_tax_leaves_the_total_alone(self):
        tax = Tax(0)
        total = total_with_tax([10, 20], tax)
        self.assertEqual(total, 30)


if __name__ == "__main__":
    unittest.main()
