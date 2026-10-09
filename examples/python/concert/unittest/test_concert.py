import unittest
from concert import Concert


# Bad: helpers hide the concert, so the test reads as bare numbers
def small_concert():
    return Concert(10, 20)


def buy_and_check(test, concert, count, cost, left):
    test.assertEqual(concert.buy(count), cost)
    test.assertEqual(concert.seats_left(), left)


class ConcertTest(unittest.TestCase):
    def test_buying(self):
        concert = small_concert()
        buy_and_check(self, concert, 2, 40, 8)
        buy_and_check(self, concert, 5, 90, 3)

    # Good: each test shows the concert, what is bought, and the result
    def test_tickets_cost_the_price_each(self):
        concert = Concert(capacity=10, price=20)
        cost = concert.buy(2)
        self.assertEqual(cost, 40)

    def test_5_tickets_or_more_get_10_percent_off(self):
        concert = Concert(capacity=10, price=20)
        cost = concert.buy(5)
        self.assertEqual(cost, 90)

    def test_bought_seats_are_gone(self):
        concert = Concert(capacity=10, price=20)
        concert.buy(4)
        self.assertEqual(concert.seats_left(), 6)

    def test_buying_more_than_are_left_is_refused(self):
        concert = Concert(capacity=3, price=20)
        with self.assertRaisesRegex(ValueError, "Not enough seats left"):
            concert.buy(4)

    def test_buying_no_tickets_is_refused(self):
        concert = Concert(capacity=10, price=20)
        with self.assertRaisesRegex(ValueError, "Buy at least 1 ticket"):
            concert.buy(0)


if __name__ == "__main__":
    unittest.main()
