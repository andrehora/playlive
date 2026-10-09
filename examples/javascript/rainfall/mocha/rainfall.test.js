const { expect } = require("chai");
const { total, average } = require("./rainfall");

describe("Rainfall", () => {
  // 0.1 + 0.2 is 0.30000000000000004 in floating point, so an exact check of
  // 0.3 would fail. closeTo compares within a tiny margin instead
  it("totals the rainfall", () => {
    expect(total([0.1, 0.2])).to.be.closeTo(0.3, 1e-10);
  });

  // 0.7 / 3 never ends, so the test says how close is close enough
  it("averages the rainfall", () => {
    expect(average([0.1, 0.2, 0.4])).to.be.closeTo(0.233, 0.001);
  });
});
