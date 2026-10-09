const { Cart, MemoryStore } = require("./saved-cart");

describe("Saved cart", () => {
  // Bad: it checks how the cart talks to its store, not what it holds
  it("saves the items when adding", () => {
    const store = jasmine.createSpyObj("store", { load: {}, save: undefined });
    new Cart(store).add("tea", 2);
    expect(store.save).toHaveBeenCalledOnceWith({ tea: 2 });
  });

  // Good: it checks the result, with a real store
  it("counts the added items", () => {
    const cart = new Cart(new MemoryStore());
    cart.add("tea", 2);
    cart.add("cake", 1);
    expect(cart.count()).toBe(3);
  });

  it("keeps the cart for the next visit", () => {
    const store = new MemoryStore();
    new Cart(store).add("tea", 2);
    const nextVisit = new Cart(store);
    expect(nextVisit.count()).toBe(2);
  });

  it("forgets a removed item", () => {
    const cart = new Cart(new MemoryStore());
    cart.add("tea", 2);
    cart.remove("tea");
    expect(cart.count()).toBe(0);
  });

  it("refuses to add nothing", () => {
    const cart = new Cart(new MemoryStore());
    expect(() => cart.add("tea", 0)).toThrowError("Add at least 1");
  });
});
