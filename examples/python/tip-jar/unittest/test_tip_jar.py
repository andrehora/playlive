import unittest
from tip_jar import TipJar


class TipJarTest(unittest.TestCase):
    # Bad: it reads the private list, so storing tips another way breaks it
    def test_tips_are_kept_in_a_list(self):
        jar = TipJar()
        jar.add(2)
        jar.add(3)
        self.assertEqual(jar._tips, [2, 3])

    # Good: through add() and total(), as callers use it
    def test_tips_add_up(self):
        jar = TipJar()
        jar.add(2)
        jar.add(3)
        self.assertEqual(jar.total(), 5)

    def test_an_empty_jar_holds_nothing(self):
        total = TipJar().total()
        self.assertEqual(total, 0)

    def test_a_tip_must_be_positive(self):
        jar = TipJar()
        with self.assertRaisesRegex(ValueError, "A tip must be positive"):
            jar.add(0)


if __name__ == "__main__":
    unittest.main()
