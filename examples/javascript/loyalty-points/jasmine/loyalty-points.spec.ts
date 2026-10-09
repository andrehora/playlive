import { loyaltyPoints } from "./loyalty-points";

describe("Loyalty points", () => {
  // Bad: it runs every line but the throw, so line coverage looks fine, yet each
  // if goes only one way (Branch: 4 of 8 branches), and "> 0" checks almost nothing
  it("gives points to a member on their birthday", () => {
    expect(loyaltyPoints(300, true, true)).toBeGreaterThan(0);
  });

  // Good: each way through each if, with the points it should give
  it("gives a point for each euro", () => {
    const points = loyaltyPoints(40, false, false);
    expect(points).toBe(40);
  });

  it("gives members double", () => {
    const points = loyaltyPoints(40, true, false);
    expect(points).toBe(80);
  });

  it("adds 50 on a birthday", () => {
    const points = loyaltyPoints(40, false, true);
    expect(points).toBe(90);
  });

  it("stops at 500 points", () => {
    const points = loyaltyPoints(300, true, false);
    expect(points).toBe(500);
  });

  it("refuses a negative amount", () => {
    expect(() => loyaltyPoints(-1, false, false)).toThrowError("Amount cannot be negative");
  });
});
