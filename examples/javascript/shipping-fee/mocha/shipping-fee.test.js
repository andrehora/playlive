const { expect } = require("chai");
const { shippingFee } = require("./shipping-fee");

describe("Shipping fee", () => {
  // Bad: every line runs, but each if goes one way and the fee is not checked
  it("works out a fee", () => {
    expect(shippingFee(60, true)).to.not.equal(null);
  });

  // Good: each way through each if, with its fee
  it("charges 5 on small orders", () => {
    const fee = shippingFee(40, false);
    expect(fee).to.equal(5);
  });

  it("ships free from 50", () => {
    const fee = shippingFee(50, false);
    expect(fee).to.equal(0);
  });

  it("adds 10 for express", () => {
    const fee = shippingFee(40, true);
    expect(fee).to.equal(15);
  });

  it("still charges 10 for express when shipping is free", () => {
    const fee = shippingFee(60, true);
    expect(fee).to.equal(10);
  });
});
