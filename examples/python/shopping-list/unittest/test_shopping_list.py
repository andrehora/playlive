import unittest
from shopping_list import parse, summary


class ShoppingListTest(unittest.TestCase):
    # assertEqual compares what is inside, item by item. assertIs would ask
    # whether both are the same object, and a list written in the test never is
    def test_splits_the_text_into_items(self):
        self.assertEqual(parse("milk, bread"), ["milk", "bread"])

    def test_sums_up_the_list(self):
        self.assertEqual(summary(["milk", "bread"]), {"count": 2, "first": "milk"})


if __name__ == "__main__":
    unittest.main()
