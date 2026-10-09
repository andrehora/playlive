import unittest
from palindrome import is_palindrome


class PalindromeTest(unittest.TestCase):
    def test_spots_a_palindrome(self):
        cases = [
            ("racecar", True),
            ("Racecar", True),
            ("Never odd or even", True),
            ("Was it a car or a cat I saw?", True),
            ("hello", False),
            ("palindrome", False),
        ]
        for text, expected in cases:
            # subTest reports every failing case, not just the first
            with self.subTest(text=text):
                self.assertEqual(is_palindrome(text), expected)


if __name__ == "__main__":
    unittest.main()
