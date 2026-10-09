from unittest.mock import Mock
from visit_counter import VisitCounter


# Good: a fake, counts kept in a dict. As cheap as a mock, and it behaves
class FakeStore:
    def __init__(self):
        self.counts = {}

    def get(self, key):
        return self.counts.get(key, 0)

    def set(self, key, value):
        self.counts[key] = value


# Bad: a mock told what get returns. To show two visits adding up it would
# have to be told each answer in turn
def test_a_visit_adds_one():
    store = Mock()
    store.get.return_value = 4
    assert VisitCounter(store).visit("home") == 5
    store.set.assert_called_once_with("home", 5)


# Good: the fake
def test_two_visits_count_two():
    counter = VisitCounter(FakeStore())
    counter.visit("home")
    count = counter.visit("home")
    assert count == 2


def test_each_page_is_counted_apart():
    counter = VisitCounter(FakeStore())
    counter.visit("home")
    count = counter.visit("about")
    assert count == 1
