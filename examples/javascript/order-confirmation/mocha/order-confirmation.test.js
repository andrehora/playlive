const { expect } = require("chai");
const sinon = require("sinon");
const { pricing, placeOrder } = require("./order-confirmation");

describe("Order confirmation", () => {
  // Bad: it mocks total, our own pricing rule, so the rule is never tested. One
  // 20 item with the coupon costs 10, yet the order says 50
  it("charges an order", () => {
    const rule = sinon.stub(pricing, "total").returns(50);
    const gateway = { charge: sinon.stub() }, mailer = { send: sinon.stub() };
    const amount = placeOrder("ana@example.test", [[20, 1]], "SAVE10", gateway, mailer);
    rule.restore();
    expect(amount).to.equal(50);
  });

  // Good: only the gateway and the mailer, the boundaries, are mocked; the
  // pricing runs for real
  it("charges the card the total", () => {
    const gateway = { charge: sinon.stub() }, mailer = { send: sinon.stub() };
    placeOrder("ana@example.test", [[20, 2], [5, 1]], "", gateway, mailer);
    expect(gateway.charge.calledOnceWith(45)).to.equal(true);
  });

  it("takes 10 off with the coupon", () => {
    const gateway = { charge: sinon.stub() }, mailer = { send: sinon.stub() };
    const amount = placeOrder("ana@example.test", [[20, 2], [5, 1]], "SAVE10", gateway, mailer);
    expect(amount).to.equal(35);
  });

  it("emails a confirmation", () => {
    const gateway = { charge: sinon.stub() }, mailer = { send: sinon.stub() };
    placeOrder("ana@example.test", [[20, 2], [5, 1]], "", gateway, mailer);
    expect(mailer.send.calledOnceWith("ana@example.test", "Order confirmed: 45")).to.equal(true);
  });

  it("charges nothing when there is nothing to pay", () => {
    const gateway = { charge: sinon.stub() }, mailer = { send: sinon.stub() };
    expect(() => placeOrder("ana@example.test", [[10, 1]], "SAVE10", gateway, mailer)).to.throw("Nothing to pay");
    expect(gateway.charge.called).to.equal(false);
  });
});
