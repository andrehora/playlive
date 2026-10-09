const { expect } = require("chai");
const { isPalindrome } = require("./palindrome");

describe("Palindrome", () => {
  const cases = [
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
