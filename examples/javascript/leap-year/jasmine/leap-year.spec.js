const { isLeap } = require("./leap-year");

describe("Leap year", () => {
  // Bad: a loop with a formula of its own. It is wrong for 1900, which it never tries
  it("knows the leap years", () => {
    for (let year = 2000; year < 2030; year++) {
      expect(isLeap(year)).toBe(year % 4 === 0);
    }
  });

  // Good: the years and their answers, written out
  it("makes a year divisible by 4 leap", () => {
    const leap = isLeap(2024);
    expect(leap).toBe(true);
  });

  it("makes other years not leap", () => {
    const leap = isLeap(2023);
    expect(leap).toBe(false);
  });

  it("makes a century not leap", () => {
    const leap = isLeap(1900);
    expect(leap).toBe(false);
  });

  it("makes every 400th year leap, century or not", () => {
    const leap = isLeap(2000);
    expect(leap).toBe(true);
  });
});
