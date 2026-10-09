import unittest
from unittest.mock import Mock
from online_shop import Inventory, Prices, Shop


class OnlineShopTest(unittest.TestCase):
    # Bad: every collaborator is a mock, so the real Inventory and Prices never
    # run: break them and this still passes. It also pins down each call, in
    # order, so a refactor that changes nothing a customer sees breaks it
    def test_an_order_takes_the_items_and_asks_the_price(self):
        inventory, prices = Mock(), Mock()
        prices.cost.return_value = 12
        self.assertEqual(Shop(inventory, prices).order("tea", 3), 12)
        inventory.take.assert_called_once_with("tea", 3)
        prices.cost.assert_called_once_with("tea", 3)

    # Good: the real Inventory and Prices, which cost nothing to make
    def test_an_order_costs_the_price_times_the_count(self):
        shop = Shop(Inventory({"tea": 5}), Prices({"tea": 4}))
        cost = shop.order("tea", 3)
        self.assertEqual(cost, 12)

    def test_an_order_takes_from_the_stock(self):
        inventory = Inventory({"tea": 5})
        Shop(inventory, Prices({"tea": 4})).order("tea", 3)
        self.assertEqual(inventory.available("tea"), 2)

    def test_ordering_more_than_is_in_stock_is_refused(self):
        shop = Shop(Inventory({"tea": 2}), Prices({"tea": 4}))
        with self.assertRaisesRegex(ValueError, "Not enough tea"):
            shop.order("tea", 3)


if __name__ == "__main__":
    unittest.main()
