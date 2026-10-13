import pytest
from todo_api import TodoApi, TodoList


# Fake: JSONPlaceholder has the same routes as the real API, with test data.
# It answers as if it saved a new todo, but does not keep it
class FakeTodoApi(TodoApi):
    def __init__(self):
        super().__init__("https://jsonplaceholder.typicode.com")


@pytest.fixture
def todos():
    return TodoList(FakeTodoApi())


def test_gets_the_title_of_a_todo(todos):
    assert todos.title_of(1) == "delectus aut autem"


def test_gets_no_title_for_a_missing_todo(todos):
    assert todos.title_of(9999) is None


def test_lists_only_pending_todos(todos):
    pending = todos.pending(1)
    assert "delectus aut autem" in pending
    assert "et porro tempora" not in pending


def test_tells_the_progress_of_a_user(todos):
    assert todos.progress(1) == "11 of 20 done"


def test_adds_a_todo(todos):
    assert todos.add(1, "Write an integration test") == 201


def test_refuses_an_empty_title(todos):
    with pytest.raises(ValueError):
        todos.add(1, "  ")
