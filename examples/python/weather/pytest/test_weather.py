from unittest.mock import Mock
from weather import Forecast, what_to_wear


# Bad: it mocks SkyApi, which is not ours, so SkyApi's changes break it
def test_wears_a_coat_in_the_cold():
    api = Mock()
    api.fetch.return_value = {"data": {"current": {"temp_c": 8}}}
    assert what_to_wear("Oslo", Forecast(api)) == "Coat"
    api.fetch.assert_called_once_with("/current?city=Oslo")


# Good: it mocks Forecast, our own wrapper around SkyApi
def test_below_15_is_coat_weather():
    forecast = Mock()
    forecast.temperature.return_value = 14
    clothes = what_to_wear("Oslo", forecast)
    assert clothes == "Coat"


def test_15_is_t_shirt_weather():
    forecast = Mock()
    forecast.temperature.return_value = 15
    clothes = what_to_wear("Lisbon", forecast)
    assert clothes == "T-shirt"
