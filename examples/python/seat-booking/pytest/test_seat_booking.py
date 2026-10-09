import pytest
from seat_booking import book


# Bad: only the happy path. Zero, negative, too many, the last seats and a
# full show are never tried
def test_books_seats():
    assert book(10, 2) == 8


# Good: the unhappy paths and the edges too
def test_booking_no_seats_is_refused():
    with pytest.raises(ValueError, match="Book at least 1 seat"):
        book(10, 0)


def test_booking_a_negative_number_is_refused():
    with pytest.raises(ValueError, match="Book at least 1 seat"):
        book(10, -1)


def test_booking_more_than_are_left_is_refused():
    with pytest.raises(ValueError, match="Not enough seats"):
        book(10, 11)


def test_booking_the_last_seats_leaves_none():
    left = book(10, 10)
    assert left == 0


def test_a_full_show_takes_no_booking():
    with pytest.raises(ValueError, match="Not enough seats"):
        book(0, 1)
