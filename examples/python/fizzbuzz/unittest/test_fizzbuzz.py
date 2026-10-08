import unittest
from fizzbuzz import fizzbuzz


class FizzBuzzTest(unittest.TestCase):
    def test_each_rule(self):
        cases = [(1, "1"), (3, "Fizz"), (5, "Buzz"), (15, "FizzBuzz"), (98, "98")]
        for n, expected in cases:
            # subTest reports every failing case, not just the first
            with self.subTest(n=n):
                self.assertEqual(fizzbuzz(n), expected)


if __name__ == "__main__":
    unittest.main()
