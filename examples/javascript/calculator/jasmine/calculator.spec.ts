import { add, subtract, multiply, divide } from "./calculator";

describe("Calculator", () => {
  it("adds", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("subtracts", () => {
    expect(subtract(10, 4)).toBe(6);
  });

  it("multiplies", () => {
    expect(multiply(3, 4)).toBe(12);
  });

  it("divides", () => {
    expect(divide(10, 4)).toBe(2.5);
  });

  it("refuses to divide by zero", () => {
    expect(() => divide(1, 0)).toThrowError("Cannot divide by zero");
  });
});
