import unittest
from cart import Cart


class CartTest(unittest.TestCase):
    def test_new_cart_is_empty(self):
        cart = Cart()
        self.assertEqual(cart.count(), 0)
        self.assertEqual(cart.total(), 0)

    def test_adding_the_same_item_twice_adds_up(self):
        cart = Cart()
        cart.add("Mug", 8.50)
        cart.add("Mug", 8.50, qty=2)
        self.assertEqual(cart.count(), 3)
        self.assertEqual(cart.total(), 25.50)

    def test_coupon_takes_ten_percent_off(self):
        cart = Cart()
        cart.add("Lamp", 40)
        cart.apply_coupon("SAVE10")
        self.assertEqual(cart.total(), 36)

    def test_unknown_coupon_is_refused(self):
        cart = Cart()
        with self.assertRaisesRegex(ValueError, "Unknown coupon"):
            cart.apply_coupon("FREE")


if __name__ == "__main__":
    unittest.main()
