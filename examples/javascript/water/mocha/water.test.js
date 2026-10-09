const { expect } = require("chai");
const { state } = require("./water");

// No test checks "steam": Coverage shows the line that never runs
describe("Water", () => {
  it("freezes at 0", () => {
    expect(state(0)).to.equal("ice");
  });

  it("is liquid at 20", () => {
    expect(state(20)).to.equal("water");
  });
});
