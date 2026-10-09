const { expect } = require("chai");
const { fare } = require("./bus-fare");

describe("Bus fare", () => {
  it("charges children half", () => {
    expect(fare(8)).to.equal(1);
  });

  it("charges adults the full fare", () => {
    expect(fare(30)).to.equal(2);
  });

  // Not built yet: skipped, so it does not run
  it.skip("lets seniors travel free", () => {
    expect(fare(70)).to.equal(0);
  });
});
