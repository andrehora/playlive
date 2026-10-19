from rich.measure import Measurement


def test_clamp():
    measurement = Measurement(20, 100)
    assert measurement.clamp(10, 50) == Measurement(20, 50)
    assert measurement.clamp(30, 50) == Measurement(30, 50)
    assert measurement.clamp(None, 50) == Measurement(20, 50)
    assert measurement.clamp(30, None) == Measurement(30, 100)
    assert measurement.clamp(None, None) == Measurement(20, 100)
