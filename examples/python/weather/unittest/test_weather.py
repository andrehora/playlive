import unittest
from unittest.mock import Mock
from weather import Forecast, what_to_wear


class WeatherTest(unittest.TestCase):
    # Bad: it mocks SkyApi, which is not ours, so SkyApi's changes break it
    def test_wears_a_coat_in_the_cold(self):
        api = Mock()
        api.fetch.return_value = {"data": {"current": {"temp_c": 8}}}
        self.assertEqual(what_to_wear("Oslo", Forecast(api)), "Coat")
        api.fetch.assert_called_once_with("/current?city=Oslo")

    # Good: it mocks Forecast, our own wrapper around SkyApi
    def test_below_15_is_coat_weather(self):
        forecast = Mock()
        forecast.temperature.return_value = 14
        clothes = what_to_wear("Oslo", forecast)
        self.assertEqual(clothes, "Coat")

    def test_15_is_t_shirt_weather(self):
        forecast = Mock()
        forecast.temperature.return_value = 15
        clothes = what_to_wear("Lisbon", forecast)
        self.assertEqual(clothes, "T-shirt")


if __name__ == "__main__":
    unittest.main()
