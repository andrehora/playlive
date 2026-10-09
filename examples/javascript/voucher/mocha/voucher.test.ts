import { expect } from "chai";
import { isExpired } from "./voucher";

describe("Voucher", () => {
  // Bad: it reads the real clock, so it passes until 2030 and then fails, with
  // no change to the code
  it("is still good for 2030", () => {
    expect(isExpired(new Date("2030-01-01"))).to.equal(false);
  });

  // Good: each test says what day it is, so every run gives the same result
  it("is good the day before", () => {
    const expired = isExpired(new Date("2030-01-01"), new Date("2029-12-31"));
    expect(expired).to.equal(false);
  });

  it("is good on its last day", () => {
    const expired = isExpired(new Date("2030-01-01"), new Date("2030-01-01"));
    expect(expired).to.equal(false);
  });

  it("expires the day after", () => {
    const expired = isExpired(new Date("2030-01-01"), new Date("2030-01-02"));
    expect(expired).to.equal(true);
  });
});
