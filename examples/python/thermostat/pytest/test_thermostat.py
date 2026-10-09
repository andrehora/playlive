from types import SimpleNamespace
from thermostat import Sensor, Thermostat, heating_on_now


# Bad: heating_on_now makes its own Sensor, so the test has to patch the class
# for everyone, and knows how heating_on_now is built inside
def test_heating_comes_on_when_cold(monkeypatch):
    monkeypatch.setattr(Sensor, "read", lambda self: 18)
    assert heating_on_now(20) is True


# Good: the Thermostat is handed a sensor of the test's own
def test_heating_comes_on_below_the_target():
    sensor = SimpleNamespace(read=lambda: 18)
    thermostat = Thermostat(sensor)
    heating = thermostat.heating_on(20)
    assert heating is True


def test_heating_stays_off_at_the_target():
    sensor = SimpleNamespace(read=lambda: 20)
    thermostat = Thermostat(sensor)
    heating = thermostat.heating_on(20)
    assert heating is False
