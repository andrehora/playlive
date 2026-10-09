const { TipJar } = require("./tip-jar");

describe("Tip jar", () => {
  // Bad: it reads the private list, so keeping the tips another way breaks it,
  // though total() still works
  it("keeps the tips in a list", () => {
    const jar = new TipJar();
    jar.add(2);
    jar.add(3);
    expect(jar._tips).toEqual([2, 3]);
  });

  // Good: through add() and total(), as callers use it
  it("adds up the tips", () => {
    const jar = new TipJar();
    jar.add(2);
    jar.add(3);
    expect(jar.total()).toBe(5);
  });

  it("holds nothing when empty", () => {
    const total = new TipJar().total();
    expect(total).toBe(0);
  });

  it("refuses a tip that is not positive", () => {
    const jar = new TipJar();
    expect(() => jar.add(0)).toThrowError("A tip must be positive");
  });
});
