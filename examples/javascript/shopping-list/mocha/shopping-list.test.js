const { expect } = require("chai");
const { parse, summary } = require("./shopping-list");

describe("Shopping list", () => {
  // to.deep.equal compares what is inside, item by item. to.equal would ask whether
  // both are the same object, and an array written in the test never is
  it("splits the text into items", () => {
    expect(parse("milk, bread")).to.deep.equal(["milk", "bread"]);
  });

  it("sums up the list", () => {
    expect(summary(["milk", "bread"])).to.deep.equal({ count: 2, first: "milk" });
  });
});
