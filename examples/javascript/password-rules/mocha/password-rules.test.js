const { expect } = require("chai");
const { strength } = require("./password-rules");

describe("Password rules", () => {
  // Bad: it runs every line and every branch, so coverage is 100%, but it checks
  // only one of the three answers. The Mutation tab shows what slips through
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
