import unittest
from menu import dishes, price_of


class MenuTest(unittest.TestCase):
    # Not every check is assertEqual. Each has its own, and a failure says what
    # was expected: assertIn, assertIsNone, assertLess (and assertNotIn,
    # assertIsNotNone, assertGreater, …)
    def test_has_soup(self):
        self.assertIn("soup", dishes())

    def test_has_no_price_for_a_dish_not_on_the_menu(self):
        self.assertIsNone(price_of("pizza"))

    def test_keeps_the_soup_under_5(self):
        self.assertLess(price_of("soup"), 5)


if __name__ == "__main__":
    unittest.main()
