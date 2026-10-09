import unittest
from parking_meter import ParkingMeter


class ParkingMeterTest(unittest.TestCase):
    # Bad: one test for the method, holding four behaviors. When it fails, its
    # name doesn't say which one broke
    def test_pay(self):
        meter = ParkingMeter()
        meter.pay(1)
        self.assertEqual(meter.minutes, 30)
        meter.pay(5)
        self.assertEqual(meter.minutes, 120)
        with self.assertRaises(ValueError):
            meter.pay(0)

    # Good: one test per behavior, named for what it does
    def test_each_euro_buys_30_minutes(self):
        meter = ParkingMeter()
        meter.pay(2)
        self.assertEqual(meter.minutes, 60)

    def test_paying_adds_to_the_time_left(self):
        meter = ParkingMeter(minutes=20)
        meter.pay(1)
        self.assertEqual(meter.minutes, 50)

    def test_two_hours_is_the_most(self):
        meter = ParkingMeter(minutes=100)
        meter.pay(1)
        self.assertEqual(meter.minutes, 120)

    def test_paying_nothing_is_refused(self):
        meter = ParkingMeter()
        with self.assertRaisesRegex(ValueError, "Pay at least 1 euro"):
            meter.pay(0)


if __name__ == "__main__":
    unittest.main()
