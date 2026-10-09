import { expect } from "chai";
import { TipJar } from "./tip-jar";

describe("Tip jar", () => {
  // Bad: it reads the private list, so keeping the tips another way breaks it,
  // though total() still works
  it("keeps the tips in a list", () => {
    const jar = new TipJar();
    jar.add(2);
    jar.add(3);
    expect(jar["tips"]).to.deep.equal([2, 3]);
  });

  // Good: through add() and total(), as callers use it
  it("adds up the tips", () => {
    const jar = new TipJar();
    jar.add(2);
    jar.add(3);
    expect(jar.total()).to.equal(5);
  });

  it("holds nothing when empty", () => {
    const total = new TipJar().total();
    expect(total).to.equal(0);
  });

  it("refuses a tip that is not positive", () => {
    const jar = new TipJar();
    expect(() => jar.add(0)).to.throw("A tip must be positive");
  });
});
