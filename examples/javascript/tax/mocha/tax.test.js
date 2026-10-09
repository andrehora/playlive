const { expect } = require("chai");
const sinon = require("sinon");
const { Tax, totalWithTax } = require("./tax");

describe("Tax", () => {
  // Bad: a mock Tax, told what to answer, and a check of how it was called. Tax
  // itself never runs, and taxing each price instead breaks it, with the same totals
  it("asks the tax once for the total", () => {
    const tax = { on: sinon.stub().returns(6) };
    expect(totalWithTax([10, 20], tax)).to.equal(36);
    expect(tax.on.calledOnceWith(30)).to.equal(true);
  });

  // Good: a real Tax, which costs nothing to make
  it("adds the tax to the total", () => {
    const tax = new Tax(20);
    const total = totalWithTax([10, 20], tax);
    expect(total).to.equal(36);
  });

  it("leaves the total alone with no tax", () => {
    const tax = new Tax(0);
    const total = totalWithTax([10, 20], tax);
    expect(total).to.equal(30);
  });
});
