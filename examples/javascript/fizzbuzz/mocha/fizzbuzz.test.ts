import { expect } from "chai";
import { fizzbuzz } from "./fizzbuzz";

describe("FizzBuzz", () => {
  const cases: [number, string][] = [
    [1, "1"],
    [3, "Fizz"],
    [5, "Buzz"],
    [15, "FizzBuzz"],
    [98, "98"],
  ];

  // One test per case: each case passes or fails on its own
  for (const [n, expected] of cases) {
    it(`turns ${n} into ${expected}`, () => {
      expect(fizzbuzz(n)).to.equal(expected);
    });
  }
});
