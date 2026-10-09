import unittest
from ticket_counter import reset, take_ticket


# Bad: these two count on the counter as the tests before them left it, so
# the second passes only right after the first. Run it alone and it fails
class SharedCounterTest(unittest.TestCase):
    def test_the_first_ticket_is_1(self):
        self.assertEqual(take_ticket(), 1)

    def test_the_next_ticket_is_2(self):
        self.assertEqual(take_ticket(), 2)


# Good: each test puts the counter back first, so what ran before it does not matter
class TicketCounterTest(unittest.TestCase):
    def setUp(self):
        reset()

    def test_a_fresh_counter_starts_at_1(self):
        ticket = take_ticket()
        self.assertEqual(ticket, 1)

    def test_tickets_count_up(self):
        take_ticket()
        ticket = take_ticket()
        self.assertEqual(ticket, 2)


if __name__ == "__main__":
    unittest.main()
