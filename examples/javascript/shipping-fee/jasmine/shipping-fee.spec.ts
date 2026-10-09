import { shippingFee } from "./shipping-fee";

describe("Shipping fee", () => {
  // Bad: it runs every line, so line coverage says 100%, yet it barely checks
  // anything and takes only one way through each if (Branch: 2 of 4 branches)
  it("works out a fee", () => {
    expect(shippingFee(60, true)).not.toBeNull();
  });

  // Good: each way through each if, with the fee it should give
  it("charges 5 on small orders", () => {
    const fee = shippingFee(40, false);
    expect(fee).toBe(5);
  });

  it("ships free from 50", () => {
    const fee = shippingFee(50, false);
    expect(fee).toBe(0);
  });

  it("adds 10 for express", () => {
    const fee = shippingFee(40, true);
    expect(fee).toBe(15);
  });

  it("still charges 10 for express when shipping is free", () => {
    const fee = shippingFee(60, true);
    expect(fee).toBe(10);
  });
});
