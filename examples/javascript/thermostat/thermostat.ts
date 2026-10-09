// A real device: reading it needs the hardware
export class Sensor {
  read(): number {
    throw new Error("No sensor attached");
  }
}

// Easy to test: the sensor is handed in
export class Thermostat {
  constructor(private sensor: Sensor) {}

  heatingOn(target: number): boolean {
    // A bug to try: return this.sensor.read() <= target;
    return this.sensor.read() < target;
  }
}

// Hard to test: it makes its own Sensor
export function heatingOnNow(target: number): boolean {
  return new Thermostat(new Sensor()).heatingOn(target);
}
