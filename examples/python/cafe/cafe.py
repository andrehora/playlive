# Plain code, quick to run: tests can use the real one
class Menu:
    def price(self, drink):
        prices = {"espresso": 3, "latte": 4}
        return prices[drink]


class Promotions:
    # In the app, it asks the head office for today's discount
    def discount_today(self):
        raise ConnectionError("No head office in tests")


class OrderBook:
    # In the app, it keeps the orders in a database
    def save(self, order_id, total):
        raise ConnectionError(f"No database in tests (order {order_id}: {total})")

    def total(self, order_id):
        raise ConnectionError(f"No database in tests (order {order_id})")


class Kitchen:
    # In the app, it prints a ticket for the barista
    def print_ticket(self, order_id, drinks):
        raise ConnectionError(f"No printer in tests (order {order_id}: {drinks})")


class Cafe:
    def __init__(self, menu, promotions, orders, kitchen):
        self.menu = menu
        self.promotions = promotions
        self.orders = orders
        self.kitchen = kitchen

    def order(self, order_id, drinks):
        total = 0
        for drink in drinks:
            total += self.menu.price(drink)
        total -= self.promotions.discount_today()
        self.orders.save(order_id, total)
        self.kitchen.print_ticket(order_id, drinks)
        return total
