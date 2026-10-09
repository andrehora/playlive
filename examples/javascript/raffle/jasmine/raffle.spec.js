const { draw } = require("./raffle");

describe("Raffle", () => {
  // Bad: it uses the real random, so each run draws someone else, and all it
  // can check is that the winner entered
  it("draws someone who entered", () => {
    expect(["Ana", "Ben", "Cy"]).toContain(draw(["Ana", "Ben", "Cy"]));
  });

  // Good: draw is handed a fixed number instead of a random one (a seeded
  // random generator would do too), so every run draws the same name
  it("draws the first name for a low number", () => {
    const winner = draw(["Ana", "Ben", "Cy"], () => 0);
    expect(winner).toBe("Ana");
  });

  it("draws the last name for a high number", () => {
    const winner = draw(["Ana", "Ben", "Cy"], () => 0.99);
    expect(winner).toBe("Cy");
  });

  it("refuses an empty raffle", () => {
    expect(() => draw([])).toThrowError("No one entered");
  });
});
