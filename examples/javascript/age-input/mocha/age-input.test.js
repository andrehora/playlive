const { expect } = require("chai");
const { parseAge } = require("./age-input");

describe("Age input", () => {
  // Bad: only the happy path. Empty, words, negative and too high are never
  // tried, nor the boundary at 150
  it("reads an age", () => {
    expect(parseAge("42")).to.equal(42);
  });

  // Good: the unhappy paths and the boundary too
  it("refuses an empty age", () => {
    expect(() => parseAge("   ")).to.throw("Age is required");
  });

  it("refuses words", () => {
    expect(() => parseAge("forty")).to.throw("Age must be a whole number");
  });

  it("refuses a negative age", () => {
    expect(() => parseAge("-5")).to.throw("Age must be a whole number");
  });

  it("takes 150 as the highest age", () => {
    const age = parseAge("150");
    expect(age).to.equal(150);
  });

  it("refuses 151", () => {
    expect(() => parseAge("151")).to.throw("Age is too high");
  });
});
