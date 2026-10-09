import pytest
from parking_meter import ParkingMeter


# Bad: one test for the method, holding four behaviors. When it fails, its
# name doesn't say which one broke
def test_pay():
    meter = ParkingMeter()
    meter.pay(1)
    assert meter.minutes == 30
    meter.pay(5)
    assert meter.minutes == 120
    with pytest.raises(ValueError):
        meter.pay(0)


# Good: one test per behavior, named for what it does
def test_each_euro_buys_30_minutes():
    meter = ParkingMeter()
    meter.pay(2)
    assert meter.minutes == 60


def test_paying_adds_to_the_time_left():
    meter = ParkingMeter(minutes=20)
    meter.pay(1)
    assert meter.minutes == 50


def test_two_hours_is_the_most():
    meter = ParkingMeter(minutes=100)
    meter.pay(1)
    assert meter.minutes == 120


def test_paying_nothing_is_refused():
    meter = ParkingMeter()
    with pytest.raises(ValueError, match="Pay at least 1 euro"):
        meter.pay(0)
