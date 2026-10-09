# A real device: reading it needs the hardware
class Sensor:
    def read(self):
        raise ConnectionError("No sensor attached")


# Easy to test: the sensor is handed in
class Thermostat:
    def __init__(self, sensor):
        self.sensor = sensor

    def heating_on(self, target):
        # A bug to try: return self.sensor.read() <= target
        return self.sensor.read() < target


# Hard to test: it makes its own Sensor
def heating_on_now(target):
    return Thermostat(Sensor()).heating_on(target)
