import unittest
from discount import discounted


class DiscountTest(unittest.TestCase):
    # Bad: the if skips 50 and 100, so the boundary is never checked
    def test_discounts(self):
        for price in [50, 100, 150]:
            if price > 100:
                self.assertEqual(discounted(price), price * 90 / 100)

    # Good: each price and what it should cost, written out
    def test_under_100_pays_full_price(self):
        price = discounted(50)
        self.assertEqual(price, 50)

    def test_100_gets_10_percent_off(self):
        price = discounted(100)
        self.assertEqual(price, 90)

    def test_150_gets_10_percent_off(self):
        price = discounted(150)
        self.assertEqual(price, 135)


if __name__ == "__main__":
    unittest.main()
