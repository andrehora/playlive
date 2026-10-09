from guest_list import GuestList


# Bad: the first two tests share one list. Run the second alone and it fails
shared = GuestList()


def test_a_guest_is_added():
    shared.add("Ana")
    assert shared.count() == 1


def test_another_guest_makes_two():
    shared.add("Ben")
    assert shared.count() == 2


# Good: each test makes its own list
def test_a_new_list_is_empty():
    guests = GuestList()
    assert guests.count() == 0


def test_two_guests_make_two():
    guests = GuestList()
    guests.add("Ana")
    guests.add("Ben")
    assert guests.count() == 2
