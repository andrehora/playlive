import pytest
from ticket_counter import reset, take_ticket


# Bad: these two share the counter. Run the second alone and it fails
def test_the_first_ticket_is_1():
    assert take_ticket() == 1


def test_the_next_ticket_is_2():
    assert take_ticket() == 2


# Good: each test resets the counter first
@pytest.fixture
def fresh_counter():
    reset()


def test_a_fresh_counter_starts_at_1(fresh_counter):
    ticket = take_ticket()
    assert ticket == 1


def test_tickets_count_up(fresh_counter):
    take_ticket()
    ticket = take_ticket()
    assert ticket == 2
