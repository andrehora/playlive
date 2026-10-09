import pytest
from unittest.mock import Mock
from todo_service import TodoService


# Fake: the to-dos kept in a dict
class InMemoryTodos:
    def __init__(self):
        self.todos = {}

    def save(self, todo):
        self.todos[todo["id"]] = todo

    def get(self, todo_id):
        return self.todos[todo_id]

    def all(self):
        return list(self.todos.values())


# Bad: a mock scripted at every step. It tests the script, not the service
def test_completing_a_todo_takes_it_off_the_list():
    repo = Mock()
    repo.all.return_value = []
    service = TodoService(repo)
    service.add("Buy milk")
    repo.get.return_value = {"id": 1, "title": "Buy milk", "done": False}
    service.complete(1)
    repo.all.return_value = [{"id": 1, "title": "Buy milk", "done": True}]
    assert service.pending() == []


# Good: the fake
def test_an_added_todo_is_pending():
    service = TodoService(InMemoryTodos())
    service.add("Buy milk")
    assert service.pending() == ["Buy milk"]


def test_a_completed_todo_is_no_longer_pending():
    service = TodoService(InMemoryTodos())
    milk = service.add("Buy milk")
    service.add("Buy bread")
    service.complete(milk)
    assert service.pending() == ["Buy bread"]


def test_a_blank_title_is_refused():
    service = TodoService(InMemoryTodos())
    with pytest.raises(ValueError, match="Title is required"):
        service.add("   ")
