import unittest
from raffle import draw


class RaffleTest(unittest.TestCase):
    # Bad: it uses the real random, so each run draws someone else, and all it
    # can check is that the winner entered
    def test_draws_someone_who_entered(self):
        self.assertIn(draw(["Ana", "Ben", "Cy"]), ["Ana", "Ben", "Cy"])

    # Good: draw is handed a fixed number instead of a random one (a seeded
    # random.Random(42).random would do too), so every run draws the same name
    def test_a_low_number_draws_the_first_name(self):
        winner = draw(["Ana", "Ben", "Cy"], rand=lambda: 0.0)
        self.assertEqual(winner, "Ana")

    def test_a_high_number_draws_the_last_name(self):
        winner = draw(["Ana", "Ben", "Cy"], rand=lambda: 0.99)
        self.assertEqual(winner, "Cy")

    def test_an_empty_raffle_is_refused(self):
        with self.assertRaisesRegex(ValueError, "No one entered"):
            draw([])


if __name__ == "__main__":
    unittest.main()
