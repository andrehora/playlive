const { discounted } = require("./discount");

describe("Discount", () => {
  // Bad: a loop with an if, so only the prices the if lets through are checked.
  // 50 and 100 never are, and the boundary at 100 goes untested
  it("discounts", () => {
    for (const price of [50, 100, 150]) {
      if (price > 100) {
        expect(discounted(price)).toBe(price * 90 / 100);
      }
    }
  });

  // Good: each price and what it should cost, written out
  it("charges full price under 100", () => {
    const price = discounted(50);
    expect(price).toBe(50);
  });

  it("takes 10% off 100", () => {
    const price = discounted(100);
    expect(price).toBe(90);
  });

  it("takes 10% off 150", () => {
    const price = discounted(150);
    expect(price).toBe(135);
  });
});
