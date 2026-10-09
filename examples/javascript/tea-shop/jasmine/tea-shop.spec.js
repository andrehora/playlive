const { Menu, bill } = require("./tea-shop");

describe("Tea shop", () => {
  // Bad: a mock menu, so the real Menu never runs
  it("asks the menu for each price", () => {
    const menu = jasmine.createSpyObj("menu", { priceOf: 3 });
    expect(bill(["tea", "cake"], menu)).toBe(6);
    expect(menu.priceOf).toHaveBeenCalledWith("tea");
    expect(menu.priceOf).toHaveBeenCalledWith("cake");
  });

  // Good: a real Menu, which costs nothing to make
  it("adds up the prices", () => {
    const menu = new Menu({ tea: 3, cake: 4 });
    const total = bill(["tea", "cake"], menu);
    expect(total).toBe(7);
  });

  it("makes an empty bill zero", () => {
    const menu = new Menu({ tea: 3 });
    const total = bill([], menu);
    expect(total).toBe(0);
  });
});
