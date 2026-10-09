import { expect } from "chai";
import { drinkPrice } from "./happy-hour";

describe("Happy hour", () => {
  // Bad: it reads the real clock, so it fails from 17:00 to 18:59
  it("charges full price for a drink", () => {
    expect(drinkPrice(4)).to.equal(4);
  });

  // Good: each test says what time it is, so every run is the same
  it("charges full price at 16:59", () => {
    const price = drinkPrice(4, new Date(2026, 9, 9, 16, 59));
    expect(price).to.equal(4);
  });

  it("charges half price at 17:00", () => {
    const price = drinkPrice(4, new Date(2026, 9, 9, 17, 0));
    expect(price).to.equal(2);
  });

  it("charges full price again at 19:00", () => {
    const price = drinkPrice(4, new Date(2026, 9, 9, 19, 0));
    expect(price).to.equal(4);
  });
});
