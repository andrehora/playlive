import unittest
from unittest.mock import Mock
from todo_service import TodoService


# Good: a fake repository, the to-dos kept in a dict. A few lines, and it
# behaves like the real one
class InMemoryTodos:
    def __init__(self):
        self.todos = {}

    def save(self, todo):
        self.todos[todo["id"]] = todo

    def get(self, todo_id):
        return self.todos[todo_id]

    def all(self):
        return list(self.todos.values())


class TodoServiceTest(unittest.TestCase):
    # Bad: a mock told what to answer at every step, even what the list looks like
    # after completing. The test checks the mock's script more than the service
    def test_completing_a_todo_takes_it_off_the_list(self):
        repo = Mock()
        repo.all.return_value = []
        service = TodoService(repo)
        service.add("Buy milk")
        repo.get.return_value = {"id": 1, "title": "Buy milk", "done": False}
        service.complete(1)
        repo.all.return_value = [{"id": 1, "title": "Buy milk", "done": True}]
        self.assertEqual(service.pending(), [])

    # Good: the fake
    def test_an_added_todo_is_pending(self):
        service = TodoService(InMemoryTodos())
        service.add("Buy milk")
        self.assertEqual(service.pending(), ["Buy milk"])

    def test_a_completed_todo_is_no_longer_pending(self):
        service = TodoService(InMemoryTodos())
        milk = service.add("Buy milk")
        service.add("Buy bread")
        service.complete(milk)
        self.assertEqual(service.pending(), ["Buy bread"])

    def test_a_blank_title_is_refused(self):
        service = TodoService(InMemoryTodos())
        with self.assertRaisesRegex(ValueError, "Title is required"):
            service.add("   ")


if __name__ == "__main__":
    unittest.main()
