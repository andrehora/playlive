import unittest
from bowling import score


class BowlingTest(unittest.TestCase):
    # Bad: one test for the function, holding five behaviors. When it fails, its
    # name doesn't say which rule broke
    def test_score(self):
        self.assertEqual(score([0] * 20), 0)
        self.assertEqual(score([1] * 20), 20)
        self.assertEqual(score([5, 5, 3] + [0] * 17), 16)
        self.assertEqual(score([10, 3, 4] + [0] * 16), 24)
        self.assertEqual(score([10] * 12), 300)

    # Good: one test per behavior, named for the rule it checks
    def test_a_gutter_game_scores_0(self):
        total = score([0] * 20)
        self.assertEqual(total, 0)

    def test_without_spares_or_strikes_the_pins_add_up(self):
        total = score([1] * 20)
        self.assertEqual(total, 20)

    def test_a_spare_adds_the_next_roll(self):
        total = score([5, 5, 3] + [0] * 17)
        self.assertEqual(total, 16)

    def test_a_strike_adds_the_next_two_rolls(self):
        total = score([10, 3, 4] + [0] * 16)
        self.assertEqual(total, 24)

    def test_a_perfect_game_scores_300(self):
        total = score([10] * 12)
        self.assertEqual(total, 300)


if __name__ == "__main__":
    unittest.main()
