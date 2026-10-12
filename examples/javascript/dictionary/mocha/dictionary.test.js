const { expect } = require("chai");
const { Dictionary } = require("./dictionary");

describe("Dictionary", () => {
  let dictionary;

  // Setup once: before builds one dictionary for every test. No test
  // changes it, so sharing it is safe
  before(() => {
    dictionary = new Dictionary({ apple: "A round fruit", bread: "A baked food" });
  });

  it("defines a word", () => {
    expect(dictionary.define("apple")).to.equal("A round fruit");
  });

  it("ignores capital letters", () => {
    expect(dictionary.define("Bread")).to.equal("A baked food");
  });
});
