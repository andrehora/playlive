import { expect } from "chai";
import * as sinon from "sinon";
import { Payments, checkout } from "./payment";

describe("Payment", () => {
  // Bad: it mocks PayCo, which is not ours, so it copies PayCo's request and
  // reply, and breaks whenever PayCo changes them
  it("charges PayCo at checkout", () => {
    const payco = { createCharge: sinon.stub().returns({ status: "succeeded" }) };
    expect(checkout(20, new Payments(payco))).to.equal("Paid");
    expect(payco.createCharge.calledOnceWith({ amountCents: 2000, currency: "EUR" })).to.equal(true);
  });

  // Good: it mocks Payments, our own small interface in front of PayCo
  it("says paid when the charge goes through", () => {
    const payments = { charge: sinon.stub().returns(true) };
    const status = checkout(20, payments);
    expect(status).to.equal("Paid");
  });

  it("says declined when the charge does not", () => {
    const payments = { charge: sinon.stub().returns(false) };
    const status = checkout(20, payments);
    expect(status).to.equal("Declined");
  });

  it("refuses when there is nothing to pay", () => {
    expect(() => checkout(0, { charge: sinon.stub() })).to.throw("Nothing to pay");
  });
});
