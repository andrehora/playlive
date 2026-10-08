import { expect } from "chai";
import { add, subtract, multiply, divide } from "./calculator";

describe("Calculator", () => {
  it("adds", () => {
    expect(add(2, 3)).to.equal(5);
  });

  it("subtracts", () => {
    expect(subtract(10, 4)).to.equal(6);
  });

  it("multiplies", () => {
    expect(multiply(3, 4)).to.equal(12);
  });

  it("divides", () => {
    expect(divide(10, 4)).to.equal(2.5);
  });

  it("refuses to divide by zero", () => {
    expect(() => divide(1, 0)).to.throw("Cannot divide by zero");
  });
});
