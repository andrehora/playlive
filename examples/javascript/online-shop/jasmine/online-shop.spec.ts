import { Inventory, Prices, Shop } from "./online-shop";

describe("Online shop", () => {
  // Bad: all mocks, so the real classes never run, and each call is pinned
  it("takes the items and asks the price", () => {
    const inventory = jasmine.createSpyObj("inventory", ["take"]);
    const prices = jasmine.createSpyObj("prices", { cost: 12 });
    expect(new Shop(inventory, prices).order("tea", 3)).toBe(12);
    expect(inventory.take).toHaveBeenCalledOnceWith("tea", 3);
    expect(prices.cost).toHaveBeenCalledOnceWith("tea", 3);
  });

  // Good: the real Inventory and Prices, which cost nothing to make
  it("charges the price times the count", () => {
    const shop = new Shop(new Inventory({ tea: 5 }), new Prices({ tea: 4 }));
    const cost = shop.order("tea", 3);
    expect(cost).toBe(12);
  });

  it("takes the order from the stock", () => {
    const inventory = new Inventory({ tea: 5 });
    new Shop(inventory, new Prices({ tea: 4 })).order("tea", 3);
    expect(inventory.available("tea")).toBe(2);
  });

  it("refuses to sell more than is in stock", () => {
    const shop = new Shop(new Inventory({ tea: 2 }), new Prices({ tea: 4 }));
    expect(() => shop.order("tea", 3)).toThrowError("Not enough tea");
  });
});
