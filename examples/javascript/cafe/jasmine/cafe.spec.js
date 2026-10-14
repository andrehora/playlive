const { Cafe, Menu } = require("./cafe");

// Fake: in-memory version of a dependency
class FakeOrderBook {
  constructor() {
    this.totals = {};
  }

  save(orderId, total) {
    this.totals[orderId] = total;
  }

  total(orderId) {
    return this.totals[orderId];
  }
}

// Stub: returns canned data, no behavior
class StubPromotions {
  constructor(discount) {
    this.discount = discount;
  }

  discountToday() {
    return this.discount;
  }
}

describe("Cafe", () => {
  let menu;
  let orders;
  let kitchen;

  beforeEach(() => {
    // Real implementation: highest confidence, catches real bugs
    menu = new Menu();
    orders = new FakeOrderBook();
    // Mock (interaction): verifies method calls; use sparingly
    kitchen = jasmine.createSpyObj("kitchen", ["printTicket"]);
  });

  it("adds up the menu prices", () => {
    const cafe = new Cafe(menu, new StubPromotions(0), orders, kitchen);
    expect(cafe.order(1, ["espresso", "latte"])).toBe(7);
  });

  it("takes today's discount off the total", () => {
    const cafe = new Cafe(menu, new StubPromotions(1), orders, kitchen);
    expect(cafe.order(1, ["espresso", "latte"])).toBe(6);
  });

  it("saves the order", () => {
    const cafe = new Cafe(menu, new StubPromotions(0), orders, kitchen);
    cafe.order(1, ["latte"]);
    expect(orders.total(1)).toBe(4);
  });

  it("sends the kitchen a ticket", () => {
    const cafe = new Cafe(menu, new StubPromotions(0), orders, kitchen);
    cafe.order(1, ["latte"]);
    expect(kitchen.printTicket).toHaveBeenCalledOnceWith(1, ["latte"]);
  });
});
