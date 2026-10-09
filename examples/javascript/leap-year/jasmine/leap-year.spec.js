const { isLeap } = require("./leap-year");

describe("Leap year", () => {
  // Bad: a loop, and a formula of its own to work out the answer. The formula is
  // wrong (1900 was not a leap year), but none of the years it tries shows it
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
