import unittest
from temperature import to_fahrenheit, to_celsius


class TemperatureTest(unittest.TestCase):
    def test_water_freezes_at_32_fahrenheit(self):
        self.assertEqual(to_fahrenheit(0), 32)

    def test_body_temperature_in_celsius(self):
        # 98.6 F is 36.999... C, so compare to 7 decimal places, not exactly
        self.assertAlmostEqual(to_celsius(98.6), 37)

    def test_round_trip_gives_back_the_same_value(self):
        self.assertAlmostEqual(to_celsius(to_fahrenheit(21.3)), 21.3)


if __name__ == "__main__":
    unittest.main()
