const { Payments, checkout } = require("./payment");

describe("Payment", () => {
  // Bad: it mocks PayCo, which is not ours, so PayCo's changes break it
  it("charges PayCo at checkout", () => {
    const payco = jasmine.createSpyObj("payco", { createCharge: { status: "succeeded" } });
    expect(checkout(20, new Payments(payco))).toBe("Paid");
    expect(payco.createCharge).toHaveBeenCalledOnceWith({ amountCents: 2000, currency: "EUR" });
  });

  // Good: it mocks Payments, our own wrapper around PayCo
  it("says paid when the charge goes through", () => {
    const payments = jasmine.createSpyObj("payments", { charge: true });
    const status = checkout(20, payments);
    expect(status).toBe("Paid");
  });

  it("says declined when the charge does not", () => {
    const payments = jasmine.createSpyObj("payments", { charge: false });
    const status = checkout(20, payments);
    expect(status).toBe("Declined");
  });

  it("refuses when there is nothing to pay", () => {
    expect(() => checkout(0, jasmine.createSpyObj("payments", ["charge"]))).toThrowError("Nothing to pay");
  });
});
