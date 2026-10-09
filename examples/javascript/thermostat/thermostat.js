// A real device: reading it needs the hardware
class Sensor {
  read() {
    throw new Error("No sensor attached");
  }
}

// Easy to test: the sensor is handed in
class Thermostat {
  constructor(sensor) {
    this.sensor = sensor;
  }

  heatingOn(target) {
    // A bug to try: return this.sensor.read() <= target;
    return this.sensor.read() < target;
  }
}

// Hard to test: it makes its own Sensor
function heatingOnNow(target) {
  return new Thermostat(new Sensor()).heatingOn(target);
}

module.exports = { Sensor, Thermostat, heatingOnNow };
