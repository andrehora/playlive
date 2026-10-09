const { expect } = require("chai");
const sinon = require("sinon");
const { Menu, bill } = require("./tea-shop");

describe("Tea shop", () => {
  // Bad: a mock menu, so the real Menu never runs
  it("asks the menu for each price", () => {
    const menu = { priceOf: sinon.stub().returns(3) };
    expect(bill(["tea", "cake"], menu)).to.equal(6);
    expect(menu.priceOf.calledWith("tea")).to.equal(true);
    expect(menu.priceOf.calledWith("cake")).to.equal(true);
  });

  // Good: a real Menu, which costs nothing to make
  it("adds up the prices", () => {
    const menu = new Menu({ tea: 3, cake: 4 });
    const total = bill(["tea", "cake"], menu);
    expect(total).to.equal(7);
  });

  it("makes an empty bill zero", () => {
    const menu = new Menu({ tea: 3 });
    const total = bill([], menu);
    expect(total).to.equal(0);
  });
});
