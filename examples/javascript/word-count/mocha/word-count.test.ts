import { expect } from "chai";
import { countWords } from "./word-count";

describe("Word count", () => {
  // deep.equal compares what the objects hold, not whether they are the same object
  it("counts each word", () => {
    expect(countWords("the cat and the hat")).to.deep.equal({ the: 2, cat: 1, and: 1, hat: 1 });
  });

  it("ignores case and punctuation", () => {
    expect(countWords("Go, go, GO!")).to.deep.equal({ go: 3 });
  });

  it("finds no words in empty text", () => {
    expect(countWords("")).to.deep.equal({});
  });
});
