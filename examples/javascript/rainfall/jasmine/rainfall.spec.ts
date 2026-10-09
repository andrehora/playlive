import { total, average } from "./rainfall";

describe("Rainfall", () => {
  // 0.1 + 0.2 is 0.30000000000000004, so an exact check would fail
  it("totals the rainfall", () => {
    expect(total([0.1, 0.2])).toBeCloseTo(0.3, 10);
  });

  // 0.7 / 3 never ends, so the test says how close is enough
  it("averages the rainfall", () => {
    expect(average([0.1, 0.2, 0.4])).toBeCloseTo(0.233, 3);
  });
});
