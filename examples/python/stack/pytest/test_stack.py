import pytest
from stack import Stack


# A fixture: every test that asks for "stack" gets a fresh one
@pytest.fixture
def stack():
    return Stack()


def test_pop_returns_the_last_item_pushed(stack):
    stack.push(1)
    stack.push(2)
    assert stack.pop() == 2
    assert len(stack) == 1


def test_peek_does_not_remove(stack):
    stack.push(1)
    assert stack.peek() == 1
    assert len(stack) == 1


def test_pop_on_an_empty_stack_is_refused(stack):
    with pytest.raises(IndexError):
        stack.pop()
