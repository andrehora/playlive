import unittest
from counter import Counter


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


if __name__ == "__main__":
    unittest.main()
