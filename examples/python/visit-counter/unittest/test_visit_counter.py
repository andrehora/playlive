import unittest
from unittest.mock import Mock
from visit_counter import VisitCounter


# Fake: counts kept in a dict
class FakeStore:
    def __init__(self):
        self.counts = {}

    def get(self, key):
        return self.counts.get(key, 0)

    def set(self, key, value):
        self.counts[key] = value


class VisitCounterTest(unittest.TestCase):
    # Bad: a mock told what get returns. It cannot show visits adding up
    def test_a_visit_adds_one(self):
        store = Mock()
        store.get.return_value = 4
        self.assertEqual(VisitCounter(store).visit("home"), 5)
        store.set.assert_called_once_with("home", 5)

    # Good: the fake
    def test_two_visits_count_two(self):
        counter = VisitCounter(FakeStore())
        counter.visit("home")
        count = counter.visit("home")
        self.assertEqual(count, 2)

    def test_each_page_is_counted_apart(self):
        counter = VisitCounter(FakeStore())
        counter.visit("home")
        count = counter.visit("about")
        self.assertEqual(count, 1)


if __name__ == "__main__":
    unittest.main()
