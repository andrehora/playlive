import unittest
from unittest.mock import patch
from thermostat import Sensor, Thermostat, heating_on_now


# Stub: returns canned data, no behavior
class FakeSensor:
    def __init__(self, temperature):
        self.temperature = temperature

    def read(self):
        return self.temperature


class ThermostatTest(unittest.TestCase):
    # Bad: heating_on_now makes its own Sensor, so the test must patch Sensor
    def test_heating_comes_on_when_cold(self):
        with patch.object(Sensor, "read", return_value=18):
            self.assertTrue(heating_on_now(20))

    # Good: the test hands the Thermostat its own sensor
    def test_heating_comes_on_below_the_target(self):
        sensor = FakeSensor(18)
        thermostat = Thermostat(sensor)
        heating = thermostat.heating_on(20)
        self.assertTrue(heating)

    def test_heating_stays_off_at_the_target(self):
        sensor = FakeSensor(20)
        thermostat = Thermostat(sensor)
        heating = thermostat.heating_on(20)
        self.assertFalse(heating)


if __name__ == "__main__":
    unittest.main()
