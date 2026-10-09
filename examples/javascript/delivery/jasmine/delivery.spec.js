const { shipsToday } = require("./delivery");

describe("Delivery", () => {
  // Bad: it reads the real date, so it fails at the weekend
  it("ships an order today", () => {
    expect(shipsToday()).toBe(true);
  });

  // Good: each test says what day it is, so every run is the same
  it("ships a Friday order today", () => {
    const ships = shipsToday(new Date(2026, 9, 9));
    expect(ships).toBe(true);
  });

  it("holds a Saturday order", () => {
    const ships = shipsToday(new Date(2026, 9, 10));
    expect(ships).toBe(false);
  });

  it("holds a Sunday order", () => {
    const ships = shipsToday(new Date(2026, 9, 11));
    expect(ships).toBe(false);
  });
});
