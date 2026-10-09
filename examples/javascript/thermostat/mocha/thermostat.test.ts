import { expect } from "chai";
import * as sinon from "sinon";
import { Sensor, Thermostat, heatingOnNow } from "./thermostat";

describe("Thermostat", () => {
  // Bad: heatingOnNow makes its own Sensor, so the test has to patch the class
  // for everyone, and knows how heatingOnNow is built inside
  it("comes on when cold", () => {
    const read = sinon.stub(Sensor.prototype, "read").returns(18);
    const on = heatingOnNow(20);
    read.restore();
    expect(on).to.equal(true);
  });

  // Good: the Thermostat is handed a sensor of the test's own
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
