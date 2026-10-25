import unittest
from refactored_counter import Counter


class CounterTest(unittest.TestCase):
    def test_starts_at_zero(self):
        counter = Counter()
        self.assertEqual(counter.value, 0)

    def test_increment_adds_one(self):
        counter = Counter()
        counter.increment()
        self.assertEqual(counter.value, 1)

    def test_multiple_increments(self):
        counter = Counter()
        counter.increment()
        counter.increment()
        counter.increment()
        self.assertEqual(counter.value, 3)

    def test_increment_and_decrement(self):
        counter = Counter()
        counter.increment()
        counter.decrement()
        self.assertEqual(counter.value, 0)

    def test_reset_goes_back_to_zero(self):
        counter = Counter()
        counter.increment()
        counter.increment()
        counter.reset()
        self.assertEqual(counter.value, 0)

    def test_stops_decrementing_at_zero(self):
        counter = Counter()
        counter.decrement()
        self.assertEqual(counter.value, 0)

    def test_undo_reverts_increment(self):
        counter = Counter()
        counter.increment()
        counter.undo()
        self.assertEqual(counter.value, 0)

    def test_undo_reverts_reset(self):
        counter = Counter()
        counter.increment()
        counter.increment()
        counter.reset()
        counter.undo()
        self.assertEqual(counter.value, 2)

    def test_undo_with_nothing_to_undo(self):
        counter = Counter()
        counter.undo()
        self.assertEqual(counter.value, 0)

    def test_multiple_undos(self):
        counter = Counter()
        counter.increment()
        counter.increment()
        counter.increment()
        counter.undo()
        counter.undo()
        self.assertEqual(counter.value, 1)


if __name__ == "__main__":
    unittest.main()
