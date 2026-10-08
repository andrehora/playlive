import unittest
from stack import Stack


class StackTest(unittest.TestCase):
    # setUp runs before every test, so each one starts with a fresh stack
    def setUp(self):
        self.stack = Stack()
        self.stack.push(1)
        self.stack.push(2)

    def test_pop_returns_the_last_item_pushed(self):
        self.assertEqual(self.stack.pop(), 2)
        self.assertEqual(len(self.stack), 1)

    def test_peek_does_not_remove(self):
        self.assertEqual(self.stack.peek(), 2)
        self.assertEqual(len(self.stack), 2)

    def test_pop_on_an_empty_stack_is_refused(self):
        self.stack.pop()
        self.stack.pop()
        with self.assertRaises(IndexError):
            self.stack.pop()


if __name__ == "__main__":
    unittest.main()
