const { expect } = require("chai");
const sinon = require("sinon");
const { Cart, MemoryStore } = require("./saved-cart");

describe("Saved cart", () => {
  // Bad: it checks how the cart talks to its store, not what it holds
  it("saves the items when adding", () => {
    const store = { load: sinon.stub().returns({}), save: sinon.stub() };
    new Cart(store).add("tea", 2);
    expect(store.save.calledOnceWith({ tea: 2 })).to.equal(true);
  });

  // Good: it checks the result, with a real store
  it("counts the added items", () => {
    const cart = new Cart(new MemoryStore());
    cart.add("tea", 2);
    cart.add("cake", 1);
    expect(cart.count()).to.equal(3);
  });

  it("keeps the cart for the next visit", () => {
    const store = new MemoryStore();
    new Cart(store).add("tea", 2);
    const nextVisit = new Cart(store);
    expect(nextVisit.count()).to.equal(2);
  });

  it("forgets a removed item", () => {
    const cart = new Cart(new MemoryStore());
    cart.add("tea", 2);
    cart.remove("tea");
    expect(cart.count()).to.equal(0);
  });

  it("refuses to add nothing", () => {
    const cart = new Cart(new MemoryStore());
    expect(() => cart.add("tea", 0)).to.throw("Add at least 1");
  });
});
