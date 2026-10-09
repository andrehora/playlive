import unittest
from seat_booking import book


class SeatBookingTest(unittest.TestCase):
    # Bad: only the happy path. Zero, negative, too many, the last seats and a
    # full show are never tried
    def test_books_seats(self):
        self.assertEqual(book(10, 2), 8)

    # Good: the unhappy paths and the edges too
    def test_booking_no_seats_is_refused(self):
        with self.assertRaisesRegex(ValueError, "Book at least 1 seat"):
            book(10, 0)

    def test_booking_a_negative_number_is_refused(self):
        with self.assertRaisesRegex(ValueError, "Book at least 1 seat"):
            book(10, -1)

    def test_booking_more_than_are_left_is_refused(self):
        with self.assertRaisesRegex(ValueError, "Not enough seats"):
            book(10, 11)

    def test_booking_the_last_seats_leaves_none(self):
        left = book(10, 10)
        self.assertEqual(left, 0)

    def test_a_full_show_takes_no_booking(self):
        with self.assertRaisesRegex(ValueError, "Not enough seats"):
            book(0, 1)


if __name__ == "__main__":
    unittest.main()
