const { roll } = require("./dice");

describe("Dice", () => {
  it("rolls a whole number", () => {
    expect(Number.isInteger(roll())).toBe(true);
  });

  // Flaky test: look closely at the boundaries.
  it("rolls from 1 to 6", () => {
    const value = roll();
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThan(6);
  });
});
