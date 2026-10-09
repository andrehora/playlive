import unittest
from calculator import add, subtract, multiply, divide


class CalculatorTest(unittest.TestCase):
    # Very bad: one test for everything. Its name does not say what broke
    def test_calculator(self):
        self.assertEqual(add(2, 3), 5)
        self.assertEqual(subtract(10, 4), 6)
        self.assertEqual(multiply(3, 4), 12)
        self.assertEqual(divide(10, 4), 2.5)
        self.assertEqual(divide(10, 2), 5)
        with self.assertRaises(ValueError):
            divide(1, 0)

    # Bad: one test per function. Its name says what it calls, not what it should do
    def test_add(self):
        self.assertEqual(add(2, 3), 5)

    def test_subtract(self):
        self.assertEqual(subtract(10, 4), 6)

    def test_multiply(self):
        self.assertEqual(multiply(3, 4), 12)

    def test_divide(self):
        self.assertEqual(divide(10, 4), 2.5)

    # Good: one test per behavior, named for what the code should do
    def test_adds_two_numbers(self):
        self.assertEqual(add(2, 3), 5)

    def test_adds_negative_numbers(self):
        self.assertEqual(add(-2, -3), -5)

    def test_subtracts_two_numbers(self):
        self.assertEqual(subtract(10, 4), 6)

    def test_multiplies_two_numbers(self):
        self.assertEqual(multiply(3, 4), 12)

    def test_divides_into_a_decimal(self):
        self.assertEqual(divide(10, 4), 2.5)

    def test_divides_into_an_integer(self):
        self.assertEqual(divide(10, 2), 5)

    def test_refuses_to_divide_by_zero(self):
        with self.assertRaisesRegex(ValueError, "Cannot divide by zero"):
            divide(1, 0)


if __name__ == "__main__":
    unittest.main()
