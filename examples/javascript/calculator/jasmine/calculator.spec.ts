import { add, subtract, multiply, divide } from "./calculator";

describe("Calculator", () => {
  // Very bad: one test checks every method. It stops at the first wrong
  // answer, and its name does not say what broke
  it("works", () => {
    expect(add(2, 3)).toBe(5);
    expect(subtract(10, 4)).toBe(6);
    expect(multiply(3, 4)).toBe(12);
    expect(divide(10, 4)).toBe(2.5);
    expect(divide(10, 2)).toBe(5);
    expect(() => divide(1, 0)).toThrowError();
  });

  // Bad: one test per method. Better, but a name only says which method it
  // calls, not what the method should do
  it("add", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("subtract", () => {
    expect(subtract(10, 4)).toBe(6);
  });

  it("multiply", () => {
    expect(multiply(3, 4)).toBe(12);
  });

  it("divide", () => {
    expect(divide(10, 4)).toBe(2.5);
  });

  // Good: one test per behavior, and its name says what the code should do
  it("adds two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("adds negative numbers", () => {
    expect(add(-2, -3)).toBe(-5);
  });

  it("subtracts two numbers", () => {
    expect(subtract(10, 4)).toBe(6);
  });

  it("multiplies two numbers", () => {
    expect(multiply(3, 4)).toBe(12);
  });

  it("divides into a decimal", () => {
    expect(divide(10, 4)).toBe(2.5);
  });

  it("divides into an integer", () => {
    expect(divide(10, 2)).toBe(5);
  });

  it("refuses to divide by zero", () => {
    expect(() => divide(1, 0)).toThrowError("Cannot divide by zero");
  });
});
