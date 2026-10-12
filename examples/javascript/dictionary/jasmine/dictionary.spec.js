const { Dictionary } = require("./dictionary");

describe("Dictionary", () => {
  let dictionary;

  // Setup once: beforeAll builds one dictionary for every test. No test
  // changes it, so sharing it is safe
  beforeAll(() => {
    dictionary = new Dictionary({ apple: "A round fruit", bread: "A baked food" });
  });

  it("defines a word", () => {
    expect(dictionary.define("apple")).toBe("A round fruit");
  });

  it("ignores capital letters", () => {
    expect(dictionary.define("Bread")).toBe("A baked food");
  });
});
