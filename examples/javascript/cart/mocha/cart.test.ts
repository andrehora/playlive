import { expect } from "chai";
import { Cart } from "./cart";

describe("Cart", () => {
  it("starts empty", () => {
    const cart = new Cart();
    expect(cart.count()).to.equal(0);
    expect(cart.total()).to.equal(0);
  });

  it("adds up the same item added twice", () => {
    const cart = new Cart();
    cart.add("Mug", 8.5);
    cart.add("Mug", 8.5, 2);
    expect(cart.count()).to.equal(3);
    expect(cart.total()).to.equal(25.5);
  });

  it("takes ten percent off with the coupon", () => {
    const cart = new Cart();
    cart.add("Lamp", 40);
    cart.applyCoupon("SAVE10");
    expect(cart.total()).to.equal(36);
  });

  it("refuses an unknown coupon", () => {
    const cart = new Cart();
    expect(() => cart.applyCoupon("FREE")).to.throw("Unknown coupon");
  });
});
