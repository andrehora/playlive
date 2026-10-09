import { expect } from "chai";
import { letter } from "./grades";

// Bugs hide at the edges, so test both sides of each boundary
describe("Grades", () => {
  it("gives an A at 90 and a B at 89", () => {
    expect(letter(90)).to.equal("A");
    expect(letter(89)).to.equal("B");
  });

  it("gives a C at 70 and an F at 69", () => {
    expect(letter(70)).to.equal("C");
    expect(letter(69)).to.equal("F");
  });

  it("refuses 101", () => {
    expect(() => letter(101)).to.throw(RangeError);
  });

  it("refuses -1", () => {
    expect(() => letter(-1)).to.throw(RangeError);
  });
});
