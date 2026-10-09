import { expect } from "chai";
import { isPalindrome } from "./palindrome";

describe("Palindrome", () => {
  const cases: [string, boolean][] = [
    ["racecar", true],
    ["Racecar", true],
    ["Never odd or even", true],
    ["Was it a car or a cat I saw?", true],
    ["hello", false],
    ["palindrome", false],
  ];

  // One test per case: each case passes or fails on its own
  for (const [text, expected] of cases) {
    it(`says "${text}" is ${expected}`, () => {
      expect(isPalindrome(text)).to.equal(expected);
    });
  }
});
