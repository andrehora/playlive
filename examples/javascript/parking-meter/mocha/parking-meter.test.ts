import { expect } from "chai";
import { ParkingMeter } from "./parking-meter";

describe("Parking meter", () => {
  // Bad: one test for the method, holding four behaviors. When it fails, its
  // name doesn't say which one broke
  it("pay", () => {
    const meter = new ParkingMeter();
    meter.pay(1);
    expect(meter.minutes).to.equal(30);
    meter.pay(5);
    expect(meter.minutes).to.equal(120);
    expect(() => meter.pay(0)).to.throw();
  });

  // Good: one test per behavior, named for what it does
  it("gives 30 minutes for each euro", () => {
    const meter = new ParkingMeter();
    meter.pay(2);
    expect(meter.minutes).to.equal(60);
  });

  it("adds to the time left", () => {
    const meter = new ParkingMeter(20);
    meter.pay(1);
    expect(meter.minutes).to.equal(50);
  });

  it("gives two hours at most", () => {
    const meter = new ParkingMeter(100);
    meter.pay(1);
    expect(meter.minutes).to.equal(120);
  });

  it("refuses to be paid nothing", () => {
    const meter = new ParkingMeter();
    expect(() => meter.pay(0)).to.throw("Pay at least 1 euro");
  });
});
