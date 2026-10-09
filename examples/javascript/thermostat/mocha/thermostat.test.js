const { expect } = require("chai");
const sinon = require("sinon");
const { Sensor, Thermostat, heatingOnNow } = require("./thermostat");

describe("Thermostat", () => {
  // Bad: heatingOnNow makes its own Sensor, so the test must patch Sensor
  it("comes on when cold", () => {
    const read = sinon.stub(Sensor.prototype, "read").returns(18);
    const on = heatingOnNow(20);
    read.restore();
    expect(on).to.equal(true);
  });

  // Good: the test hands the Thermostat its own sensor
  it("comes on below the target", () => {
    const sensor = { read: () => 18 };
    const thermostat = new Thermostat(sensor);
    const heating = thermostat.heatingOn(20);
    expect(heating).to.equal(true);
  });

  it("stays off at the target", () => {
    const sensor = { read: () => 20 };
    const thermostat = new Thermostat(sensor);
    const heating = thermostat.heatingOn(20);
    expect(heating).to.equal(false);
  });
});
