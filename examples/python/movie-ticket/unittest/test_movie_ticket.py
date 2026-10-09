import unittest
from movie_ticket import ticket_price


# Bad: a table and a helper, so the test says nothing by itself
CASES = [(8, "Friday", 5), (30, "Tuesday", 6), (30, "Friday", 10)]


def check(test, i):
    age, day, price = CASES[i]
    test.assertEqual(ticket_price(age, day), price)


class MovieTicketTest(unittest.TestCase):
    def test_prices(self):
        check(self, 0)
        check(self, 1)
        check(self, 2)

    # Good: each test says who goes, when, and what they pay
    def test_children_under_12_pay_5(self):
        price = ticket_price(8, "Friday")
        self.assertEqual(price, 5)

    def test_a_12_year_old_pays_full_price(self):
        price = ticket_price(12, "Friday")
        self.assertEqual(price, 10)

    def test_tuesdays_cost_6(self):
        price = ticket_price(30, "Tuesday")
        self.assertEqual(price, 6)

    def test_adults_pay_10(self):
        price = ticket_price(30, "Friday")
        self.assertEqual(price, 10)


if __name__ == "__main__":
    unittest.main()
