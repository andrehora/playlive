const { pricing, placeOrder } = require("./order-confirmation");

describe("Order confirmation", () => {
  // Bad: it mocks total, our own rule, so the rule is never tested
  it("charges an order", () => {
    spyOn(pricing, "total").and.returnValue(50);
    const gateway = jasmine.createSpyObj("gateway", ["charge"]), mailer = jasmine.createSpyObj("mailer", ["send"]);
    expect(placeOrder("ana@example.test", [[20, 1]], "SAVE10", gateway, mailer)).toBe(50);
  });

  // Good: only the gateway and the mailer, the boundaries, are mocked
  it("charges the card the total", () => {
    const gateway = jasmine.createSpyObj("gateway", ["charge"]), mailer = jasmine.createSpyObj("mailer", ["send"]);
    placeOrder("ana@example.test", [[20, 2], [5, 1]], "", gateway, mailer);
    expect(gateway.charge).toHaveBeenCalledOnceWith(45);
  });

  it("takes 10 off with the coupon", () => {
    const gateway = jasmine.createSpyObj("gateway", ["charge"]), mailer = jasmine.createSpyObj("mailer", ["send"]);
    const amount = placeOrder("ana@example.test", [[20, 2], [5, 1]], "SAVE10", gateway, mailer);
    expect(amount).toBe(35);
  });

  it("emails a confirmation", () => {
    const gateway = jasmine.createSpyObj("gateway", ["charge"]), mailer = jasmine.createSpyObj("mailer", ["send"]);
    placeOrder("ana@example.test", [[20, 2], [5, 1]], "", gateway, mailer);
    expect(mailer.send).toHaveBeenCalledOnceWith("ana@example.test", "Order confirmed: 45");
  });

  it("charges nothing when there is nothing to pay", () => {
    const gateway = jasmine.createSpyObj("gateway", ["charge"]), mailer = jasmine.createSpyObj("mailer", ["send"]);
    expect(() => placeOrder("ana@example.test", [[10, 1]], "SAVE10", gateway, mailer)).toThrowError("Nothing to pay");
    expect(gateway.charge).not.toHaveBeenCalled();
  });
});
