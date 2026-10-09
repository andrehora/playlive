const { expect } = require("chai");
const { Invoice } = require("./invoice");

// Dummy: passed in, but never used
const dummyMailer = {};

describe("Invoice", () => {
  it("totals the prices", () => {
    const invoice = new Invoice([3, 4.5], dummyMailer);
    expect(invoice.total()).to.equal(7.5);
  });

  it("totals an empty invoice as zero", () => {
    const invoice = new Invoice([], dummyMailer);
    expect(invoice.total()).to.equal(0);
  });
});
