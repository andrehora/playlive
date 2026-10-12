const { expect } = require("chai");
const { dishes, priceOf } = require("./menu");

describe("Menu", () => {
  // Not every check is to.equal. Each has its own, and a failure says what was
  // expected: to.include, to.be.undefined, to.be.below (and to.be.null,
  // to.be.above, and .not before any of them)
  it("has soup", () => {
    expect(dishes()).to.include("soup");
  });

  it("has no price for a dish not on the menu", () => {
    expect(priceOf("pizza")).to.be.undefined;
  });

  it("keeps the soup under 5", () => {
    expect(priceOf("soup")).to.be.below(5);
  });
});
