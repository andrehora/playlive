const { rules, sign } = require("./shop-hours");

describe("Shop hours", () => {
  // Bad: it mocks isOpen, our own rule, so the rule is never tested
  it("says come in", () => {
    spyOn(rules, "isOpen").and.returnValue(true);
    const clock = jasmine.createSpyObj("clock", { hour: 22 });
    expect(sign(clock)).toBe("Come in");
  });

  // Good: only the clock, the boundary, is replaced
  it("is open from 9", () => {
    const clock = jasmine.createSpyObj("clock", { hour: 9 });
    const text = sign(clock);
    expect(text).toBe("Come in");
  });

  it("is closed before 9", () => {
    const clock = jasmine.createSpyObj("clock", { hour: 8 });
    const text = sign(clock);
    expect(text).toBe("Sorry, we're closed");
  });

  it("is closed from 17", () => {
    const clock = jasmine.createSpyObj("clock", { hour: 17 });
    const text = sign(clock);
    expect(text).toBe("Sorry, we're closed");
  });
});
