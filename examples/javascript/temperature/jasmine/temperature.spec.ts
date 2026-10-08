import { toFahrenheit, toCelsius } from "./temperature";

describe("Temperature", () => {
  it("freezes water at 32 fahrenheit", () => {
    expect(toFahrenheit(0)).toBe(32);
  });

  it("gives body temperature in celsius", () => {
    // 98.6 F is 36.999... C, so compare to some decimal places, not exactly
    expect(toCelsius(98.6)).toBeCloseTo(37, 7);
  });

  it("gives back the same value after a round trip", () => {
    expect(toCelsius(toFahrenheit(21.3))).toBeCloseTo(21.3, 7);
  });
});
