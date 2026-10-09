import { expect } from "chai";
import { score } from "./bowling";

describe("Bowling", () => {
  // Bad: one test for the function, holding five behaviors. When it fails, its
  // name doesn't say which rule broke
  it("scores", () => {
    expect(score(Array(20).fill(0))).to.equal(0);
    expect(score(Array(20).fill(1))).to.equal(20);
    expect(score([5, 5, 3, ...Array(17).fill(0)])).to.equal(16);
    expect(score([10, 3, 4, ...Array(16).fill(0)])).to.equal(24);
    expect(score(Array(12).fill(10))).to.equal(300);
  });

  // Good: one test per behavior, named for the rule it checks
  it("scores a gutter game 0", () => {
    const total = score(Array(20).fill(0));
    expect(total).to.equal(0);
  });

  it("adds up the pins without spares or strikes", () => {
    const total = score(Array(20).fill(1));
    expect(total).to.equal(20);
  });

  it("adds the next roll to a spare", () => {
    const total = score([5, 5, 3, ...Array(17).fill(0)]);
    expect(total).to.equal(16);
  });

  it("adds the next two rolls to a strike", () => {
    const total = score([10, 3, 4, ...Array(16).fill(0)]);
    expect(total).to.equal(24);
  });

  it("scores a perfect game 300", () => {
    const total = score(Array(12).fill(10));
    expect(total).to.equal(300);
  });
});
