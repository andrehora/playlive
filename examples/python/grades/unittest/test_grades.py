import unittest
from grades import letter


class GradesTest(unittest.TestCase):
    # Bugs hide at the edges, so test both sides of each boundary
    def test_90_is_an_a_and_89_is_a_b(self):
        self.assertEqual(letter(90), "A")
        self.assertEqual(letter(89), "B")

    def test_70_is_a_c_and_69_is_an_f(self):
        self.assertEqual(letter(70), "C")
        self.assertEqual(letter(69), "F")

    def test_scores_outside_0_to_100_are_refused(self):
        with self.assertRaises(ValueError):
            letter(101)
        with self.assertRaises(ValueError):
            letter(-1)


if __name__ == "__main__":
    unittest.main()
