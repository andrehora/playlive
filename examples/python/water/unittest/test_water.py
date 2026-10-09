import unittest
from water import state


class WaterTest(unittest.TestCase):
    # No test checks "steam": check Coverage to see the line that never runs
    def test_water_freezes_at_0(self):
        self.assertEqual(state(0), "ice")

    def test_water_is_liquid_at_20(self):
        self.assertEqual(state(20), "water")


if __name__ == "__main__":
    unittest.main()
