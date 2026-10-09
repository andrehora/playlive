const { expect } = require("chai");
const { Order } = require("./order");

describe("Order", () => {
  // Bad: it calls a private method, so renaming it breaks the test
  it("adds up the prices in the subtotal", () => {
    const order = new Order([20, 15]);
    expect(order._subtotal()).to.equal(35);
  });

  // Good: through total(), as callers use it
  it("charges 5 for shipping under 50", () => {
    const order = new Order([20, 15]);
    const total = order.total();
    expect(total).to.equal(40);
  });

  it("ships free from 50", () => {
    const order = new Order([30, 20]);
    const total = order.total();
    expect(total).to.equal(50);
  });
});
