const { expect } = require("chai");
const { letter } = require("./grades");

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

  it("refuses scores outside 0 to 100", () => {
    expect(() => letter(101)).to.throw(RangeError);
    expect(() => letter(-1)).to.throw(RangeError);
  });
});
