import { parseAge } from "./age-input";

describe("Age input", () => {
  // Bad: only the happy path
  it("reads an age", () => {
    expect(parseAge("42")).toBe(42);
  });

  // Good: the unhappy paths and the boundary too
  it("refuses an empty age", () => {
    expect(() => parseAge("   ")).toThrowError("Age is required");
  });

  it("refuses words", () => {
    expect(() => parseAge("forty")).toThrowError("Age must be a whole number");
  });

  it("refuses a negative age", () => {
    expect(() => parseAge("-5")).toThrowError("Age must be a whole number");
  });

  it("takes 150 as the highest age", () => {
    const age = parseAge("150");
    expect(age).toBe(150);
  });

  it("refuses 151", () => {
    expect(() => parseAge("151")).toThrowError("Age is too high");
  });
});
