import { expect } from "chai";
import * as sinon from "sinon";
import { Cafe, Discounts, Menu, Orders } from "./cafe";

// Fake: in-memory version of a dependency
class FakeOrderBook implements Orders {
  totals: Record<number, number> = {};

  save(orderId: number, total: number) {
    this.totals[orderId] = total;
  }

  total(orderId: number) {
    return this.totals[orderId];
  }
}

// Stub: returns canned data, no behavior
class StubPromotions implements Discounts {
  constructor(private discount: number) {}

  discountToday() {
    return this.discount;
  }
}

describe("Cafe", () => {
  let menu: Menu;
  let orders: FakeOrderBook;
  let kitchen: { printTicket: sinon.SinonStub };

  beforeEach(() => {
    // Real implementation: highest confidence, catches real bugs
    menu = new Menu();
    orders = new FakeOrderBook();
    // Mock (interaction): verifies method calls; use sparingly
    kitchen = { printTicket: sinon.stub() };
  });

  it("adds up the menu prices", () => {
    const cafe = new Cafe(menu, new StubPromotions(0), orders, kitchen);
    expect(cafe.order(1, ["espresso", "latte"])).to.equal(7);
  });

  it("takes today's discount off the total", () => {
    const cafe = new Cafe(menu, new StubPromotions(1), orders, kitchen);
    expect(cafe.order(1, ["espresso", "latte"])).to.equal(6);
  });

  it("saves the order", () => {
    const cafe = new Cafe(menu, new StubPromotions(0), orders, kitchen);
    cafe.order(1, ["latte"]);
    expect(orders.total(1)).to.equal(4);
  });

  it("sends the kitchen a ticket", () => {
    const cafe = new Cafe(menu, new StubPromotions(0), orders, kitchen);
    cafe.order(1, ["latte"]);
    expect(kitchen.printTicket.calledOnceWith(1, ["latte"])).to.equal(true);
  });
});
