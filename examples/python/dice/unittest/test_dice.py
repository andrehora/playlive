import unittest
from dice import roll


class DiceTest(unittest.TestCase):
    def test_rolls_a_whole_number(self):
        self.assertIsInstance(roll(), int)

    def test_rolls_from_1_to_6(self):
        self.assertIn(roll(), range(1, 6))


if __name__ == "__main__":
    unittest.main()
