from unittest.mock import Mock
from tax import Tax, total_with_tax


# Bad: a mock Tax, told what to answer, and a check of how it was called. Tax
# itself never runs, and taxing each price instead breaks it, with the same totals
def test_tax_is_asked_once_for_the_total():
    tax = Mock()
    tax.on.return_value = 6
    assert total_with_tax([10, 20], tax) == 36
    tax.on.assert_called_once_with(30)


# Good: a real Tax, which costs nothing to make
def test_tax_is_added_to_the_total():
    tax = Tax(20)
    total = total_with_tax([10, 20], tax)
    assert total == 36


def test_no_tax_leaves_the_total_alone():
    tax = Tax(0)
    total = total_with_tax([10, 20], tax)
    assert total == 30
