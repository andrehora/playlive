import { Sensor, Thermostat, heatingOnNow } from "./thermostat";

describe("Thermostat", () => {
  // Bad: heatingOnNow makes its own Sensor, so the test has to patch the class
  // for everyone, and knows how heatingOnNow is built inside
  it("comes on when cold", () => {
    spyOn(Sensor.prototype, "read").and.returnValue(18);
    expect(heatingOnNow(20)).toBe(true);
  });

  // Good: the Thermostat is handed a sensor of the test's own
  it("comes on below the target", () => {
    const sensor = { read: () => 18 };
    const thermostat = new Thermostat(sensor);
    const heating = thermostat.heatingOn(20);
    expect(heating).toBe(true);
  });

  it("stays off at the target", () => {
    const sensor = { read: () => 20 };
    const thermostat = new Thermostat(sensor);
    const heating = thermostat.heatingOn(20);
    expect(heating).toBe(false);
  });
});
