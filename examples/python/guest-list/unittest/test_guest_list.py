import unittest
from guest_list import GuestList


# Bad: the first two tests share one list, so the second passes only after
# the first. Run it alone (its Run button) and it fails
shared = GuestList()


class GuestListTest(unittest.TestCase):
    def test_a_guest_is_added(self):
        shared.add("Ana")
        self.assertEqual(shared.count(), 1)

    def test_another_guest_makes_two(self):
        shared.add("Ben")
        self.assertEqual(shared.count(), 2)

    # Good: each test makes its own list, so it passes alone or in any order
    def test_a_new_list_is_empty(self):
        guests = GuestList()
        self.assertEqual(guests.count(), 0)

    def test_two_guests_make_two(self):
        guests = GuestList()
        guests.add("Ana")
        guests.add("Ben")
        self.assertEqual(guests.count(), 2)


if __name__ == "__main__":
    unittest.main()
