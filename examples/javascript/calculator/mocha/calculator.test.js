const { expect } = require("chai");
const { add, subtract, multiply, divide } = require("./calculator");

describe("Calculator", () => {
  // Very bad: one test checks every method. It stops at the first wrong
  // answer, and its name does not say what broke
  it("works", () => {
    expect(add(2, 3)).to.equal(5);
    expect(subtract(10, 4)).to.equal(6);
    expect(multiply(3, 4)).to.equal(12);
    expect(divide(10, 4)).to.equal(2.5);
    expect(divide(10, 2)).to.equal(5);
    expect(() => divide(1, 0)).to.throw();
  });

  // Bad: one test per method. Better, but a name only says which method it
  // calls, not what the method should do
  it("add", () => {
    expect(add(2, 3)).to.equal(5);
  });

  it("subtract", () => {
    expect(subtract(10, 4)).to.equal(6);
  });

  it("multiply", () => {
    expect(multiply(3, 4)).to.equal(12);
  });

  it("divide", () => {
    expect(divide(10, 4)).to.equal(2.5);
  });

  // Good: one test per behavior, and its name says what the code should do
  it("adds two numbers", () => {
    expect(add(2, 3)).to.equal(5);
  });

  it("adds negative numbers", () => {
    expect(add(-2, -3)).to.equal(-5);
  });

  it("subtracts two numbers", () => {
    expect(subtract(10, 4)).to.equal(6);
  });

  it("multiplies two numbers", () => {
    expect(multiply(3, 4)).to.equal(12);
  });

  it("divides into a decimal", () => {
    expect(divide(10, 4)).to.equal(2.5);
  });

  it("divides into an integer", () => {
    expect(divide(10, 2)).to.equal(5);
  });

  it("refuses to divide by zero", () => {
    expect(() => divide(1, 0)).to.throw("Cannot divide by zero");
  });
});
