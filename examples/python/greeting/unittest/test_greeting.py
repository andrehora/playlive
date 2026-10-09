import unittest
from unittest.mock import patch
import greeting


class GreetingTest(unittest.TestCase):
    # Stub, from the framework: returns a fixed hour
    def test_morning(self):
        with patch.object(greeting, "current_hour", return_value=9):
            self.assertEqual(greeting.greet("Ana"), "Good morning, Ana")

    def test_afternoon(self):
        with patch.object(greeting, "current_hour", return_value=15):
            self.assertEqual(greeting.greet("Ana"), "Good afternoon, Ana")

    def test_evening(self):
        with patch.object(greeting, "current_hour", return_value=20):
            self.assertEqual(greeting.greet("Ana"), "Good evening, Ana")


if __name__ == "__main__":
    unittest.main()
