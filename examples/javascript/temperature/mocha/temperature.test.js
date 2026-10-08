const { expect } = require("chai");
const { toFahrenheit, toCelsius } = require("./temperature");

describe("Temperature", () => {
  it("freezes water at 32 fahrenheit", () => {
    expect(toFahrenheit(0)).to.equal(32);
  });

  it("gives body temperature in celsius", () => {
    // 98.6 F is 36.999... C, so compare within a margin, not exactly
    expect(toCelsius(98.6)).to.be.closeTo(37, 1e-7);
  });

  it("gives back the same value after a round trip", () => {
    expect(toCelsius(toFahrenheit(21.3))).to.be.closeTo(21.3, 1e-7);
  });
});
