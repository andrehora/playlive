const { state } = require("./water");

// No test checks "steam": Coverage shows the line that never runs
describe("Water", () => {
  it("freezes at 0", () => {
    expect(state(0)).toBe("ice");
  });

  it("is liquid at 20", () => {
    expect(state(20)).toBe("water");
  });
});
