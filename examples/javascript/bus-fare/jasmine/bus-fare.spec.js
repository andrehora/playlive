const { fare } = require("./bus-fare");

describe("Bus fare", () => {
  it("charges children half", () => {
    expect(fare(8)).toBe(1);
  });

  it("charges adults the full fare", () => {
    expect(fare(30)).toBe(2);
  });

  // Not built yet: skipped, so it does not run
  xit("lets seniors travel free", () => {
    expect(fare(70)).toBe(0);
  });
});
