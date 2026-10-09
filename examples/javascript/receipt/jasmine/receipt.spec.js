const { receipt } = require("./receipt");

describe("Receipt", () => {
  // Bad: it compares every line, so any new line breaks it
  it("prints the receipt", () => {
    expect(receipt([["Tea", 3], ["Cake", 4]])).toEqual(["Tea: 3", "Cake: 4", "Total: 7"]);
  });

  // Good: each test looks only for its own line
  it("shows the total", () => {
    const lines = receipt([["Tea", 3], ["Cake", 4]]);
    expect(lines).toContain("Total: 7");
  });

  it("shows each item", () => {
    const lines = receipt([["Tea", 3], ["Cake", 4]]);
    expect(lines).toContain("Cake: 4");
  });
});
