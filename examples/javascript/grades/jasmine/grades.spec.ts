import { letter } from "./grades";

// Bugs hide at the edges, so test both sides of each boundary
describe("Grades", () => {
  it("gives an A at 90 and a B at 89", () => {
    expect(letter(90)).toBe("A");
    expect(letter(89)).toBe("B");
  });

  it("gives a C at 70 and an F at 69", () => {
    expect(letter(70)).toBe("C");
    expect(letter(69)).toBe("F");
  });

  it("refuses scores outside 0 to 100", () => {
    expect(() => letter(101)).toThrowError(RangeError);
    expect(() => letter(-1)).toThrowError(RangeError);
  });
});
