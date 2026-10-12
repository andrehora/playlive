const { dishes, priceOf } = require("./menu");

describe("Menu", () => {
  // Not every check is toBe. Each has its own, and a failure says what was
  // expected: toContain, toBeUndefined, toBeLessThan (and toBeNull,
  // toBeGreaterThan, and .not before any of them)
  it("has soup", () => {
    expect(dishes()).toContain("soup");
  });

  it("has no price for a dish not on the menu", () => {
    expect(priceOf("pizza")).toBeUndefined();
  });

  it("keeps the soup under 5", () => {
    expect(priceOf("soup")).toBeLessThan(5);
  });
});
