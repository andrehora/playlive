import { expect } from "chai";
import { strength } from "./password-rules";

describe("Password rules", () => {
  // Bad: 100% coverage, but it checks only one of the three answers
  it("rates passwords", () => {
    strength("abc");
    strength("abcdefgh");
    expect(strength("abcdefgh1")).to.equal("strong");
  });

  // Good: every answer checked
  it("rates short passwords weak", () => {
    const rating = strength("abc");
    expect(rating).to.equal("weak");
  });

  it("rates long passwords of letters only medium", () => {
    const rating = strength("abcdefgh");
    expect(rating).to.equal("medium");
  });

  it("rates long passwords with a digit strong", () => {
    const rating = strength("abcdefgh1");
    expect(rating).to.equal("strong");
  });
});
