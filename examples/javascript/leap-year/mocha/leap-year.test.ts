import { expect } from "chai";
import { isLeap } from "./leap-year";

describe("Leap year", () => {
  // Bad: a loop with a formula of its own. It is wrong for 1900, which it never tries
  it("knows the leap years", () => {
    for (let year = 2000; year < 2030; year++) {
      expect(isLeap(year)).to.equal(year % 4 === 0);
    }
  });

  // Good: the years and their answers, written out
  it("makes a year divisible by 4 leap", () => {
    const leap = isLeap(2024);
    expect(leap).to.equal(true);
  });

  it("makes other years not leap", () => {
    const leap = isLeap(2023);
    expect(leap).to.equal(false);
  });

  it("makes a century not leap", () => {
    const leap = isLeap(1900);
    expect(leap).to.equal(false);
  });

  it("makes every 400th year leap, century or not", () => {
    const leap = isLeap(2000);
    expect(leap).to.equal(true);
  });
});
