import unittest
from receipt import receipt


class ReceiptTest(unittest.TestCase):
    # Bad: it compares every line, so any new line breaks it
    def test_prints_the_receipt(self):
        self.assertEqual(receipt([("Tea", 3), ("Cake", 4)]), ["Tea: 3", "Cake: 4", "Total: 7"])

    # Good: each test looks only for its own line
    def test_the_total_is_shown(self):
        lines = receipt([("Tea", 3), ("Cake", 4)])
        self.assertIn("Total: 7", lines)

    def test_each_item_is_shown(self):
        lines = receipt([("Tea", 3), ("Cake", 4)])
        self.assertIn("Cake: 4", lines)


if __name__ == "__main__":
    unittest.main()
