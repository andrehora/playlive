import { countWords } from "./word-count";

describe("Word count", () => {
  it("counts each word", () => {
    expect(countWords("the cat and the hat")).toEqual({ the: 2, cat: 1, and: 1, hat: 1 });
  });

  it("ignores case and punctuation", () => {
    expect(countWords("Go, go, GO!")).toEqual({ go: 3 });
  });

  it("finds no words in empty text", () => {
    expect(countWords("")).toEqual({});
  });
});
