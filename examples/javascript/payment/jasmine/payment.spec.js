const { Payments, checkout } = require("./payment");

describe("Payment", () => {
  // Bad: it mocks PayCo, which is not ours, so it copies PayCo's request and
  // reply, and breaks whenever PayCo changes them
  it("charges PayCo at checkout", () => {
    const payco = jasmine.createSpyObj("payco", { createCharge: { status: "succeeded" } });
    expect(checkout(20, new Payments(payco))).toBe("Paid");
    expect(payco.createCharge).toHaveBeenCalledOnceWith({ amountCents: 2000, currency: "EUR" });
  });

  // Good: it mocks Payments, our own small interface in front of PayCo
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
