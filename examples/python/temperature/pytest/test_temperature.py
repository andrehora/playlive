import pytest
from temperature import to_fahrenheit, to_celsius


def test_water_freezes_at_32_fahrenheit():
    assert to_fahrenheit(0) == 32


def test_body_temperature_in_celsius():
    # 98.6 F is 36.999... C, so compare approximately, not exactly
    assert to_celsius(98.6) == pytest.approx(37)


def test_round_trip_gives_back_the_same_value():
    assert to_celsius(to_fahrenheit(21.3)) == pytest.approx(21.3)
