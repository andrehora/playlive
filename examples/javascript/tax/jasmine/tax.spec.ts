import { Tax, totalWithTax } from "./tax";

describe("Tax", () => {
  // Bad: a mock Tax, told what to answer, and a check of how it was called. Tax
  // itself never runs, and taxing each price instead breaks it, with the same totals
  it("asks the tax once for the total", () => {
    const tax = jasmine.createSpyObj("tax", { on: 6 });
    expect(totalWithTax([10, 20], tax)).toBe(36);
    expect(tax.on).toHaveBeenCalledOnceWith(30);
  });

  // Good: a real Tax, which costs nothing to make
  it("adds the tax to the total", () => {
    const tax = new Tax(20);
    const total = totalWithTax([10, 20], tax);
    expect(total).toBe(36);
  });

  it("leaves the total alone with no tax", () => {
    const tax = new Tax(0);
    const total = totalWithTax([10, 20], tax);
    expect(total).toBe(30);
  });
});
