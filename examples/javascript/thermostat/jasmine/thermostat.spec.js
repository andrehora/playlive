const { Sensor, Thermostat, heatingOnNow } = require("./thermostat");

describe("Thermostat", () => {
  // Bad: heatingOnNow makes its own Sensor, so the test must patch Sensor
  it("comes on when cold", () => {
    spyOn(Sensor.prototype, "read").and.returnValue(18);
    expect(heatingOnNow(20)).toBe(true);
  });

  // Good: the test hands the Thermostat its own sensor
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
