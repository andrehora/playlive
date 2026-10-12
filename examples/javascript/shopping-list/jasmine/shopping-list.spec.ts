import { parse, summary } from "./shopping-list";

describe("Shopping list", () => {
  // toEqual compares what is inside, item by item. toBe would ask whether
  // both are the same object, and an array written in the test never is
  it("splits the text into items", () => {
    expect(parse("milk, bread")).toEqual(["milk", "bread"]);
  });

  it("sums up the list", () => {
    expect(summary(["milk", "bread"])).toEqual({ count: 2, first: "milk" });
  });
});
