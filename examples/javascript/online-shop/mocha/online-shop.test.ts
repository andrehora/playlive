import { expect } from "chai";
import * as sinon from "sinon";
import { Inventory, Prices, Shop } from "./online-shop";

describe("Online shop", () => {
  // Bad: all mocks, so the real classes never run, and each call is pinned
  it("takes the items and asks the price", () => {
    const inventory = { take: sinon.stub() };
    const prices = { cost: sinon.stub().returns(12) };
    expect(new Shop(inventory, prices).order("tea", 3)).to.equal(12);
    expect(inventory.take.calledOnceWith("tea", 3)).to.equal(true);
    expect(prices.cost.calledOnceWith("tea", 3)).to.equal(true);
  });

  // Good: the real Inventory and Prices, which cost nothing to make
  it("charges the price times the count", () => {
    const shop = new Shop(new Inventory({ tea: 5 }), new Prices({ tea: 4 }));
    const cost = shop.order("tea", 3);
    expect(cost).to.equal(12);
  });

  it("takes the order from the stock", () => {
    const inventory = new Inventory({ tea: 5 });
    new Shop(inventory, new Prices({ tea: 4 })).order("tea", 3);
    expect(inventory.available("tea")).to.equal(2);
  });

  it("refuses to sell more than is in stock", () => {
    const shop = new Shop(new Inventory({ tea: 2 }), new Prices({ tea: 4 }));
    expect(() => shop.order("tea", 3)).to.throw("Not enough tea");
  });
});
