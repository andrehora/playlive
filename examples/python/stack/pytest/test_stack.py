import pytest
from stack import Stack


# A fixture: every test that asks for "stack" gets a fresh one
@pytest.fixture
def stack():
    s = Stack()
    s.push(1)
    s.push(2)
    return s


def test_pop_returns_the_last_item_pushed(stack):
    assert stack.pop() == 2
    assert len(stack) == 1


def test_peek_does_not_remove(stack):
    assert stack.peek() == 2
    assert len(stack) == 2


def test_pop_on_an_empty_stack_is_refused(stack):
    stack.pop()
    stack.pop()
    with pytest.raises(IndexError):
        stack.pop()
