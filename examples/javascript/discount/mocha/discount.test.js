const { expect } = require("chai");
const { discounted } = require("./discount");

describe("Discount", () => {
  // Bad: the if skips 50 and 100, so the boundary is never checked
  it("discounts", () => {
    for (const price of [50, 100, 150]) {
      if (price > 100) {
        expect(discounted(price)).to.equal(price * 90 / 100);
      }
    }
  });

  // Good: each price and what it should cost, written out
  it("charges full price under 100", () => {
    const price = discounted(50);
    expect(price).to.equal(50);
  });

  it("takes 10% off 100", () => {
    const price = discounted(100);
    expect(price).to.equal(90);
  });

  it("takes 10% off 150", () => {
    const price = discounted(150);
    expect(price).to.equal(135);
  });
});
