const { expect } = require("chai");
const { page, pageCount } = require("./pagination");

describe("Pagination", () => {
  // Bad: a loop, and the code's own sums to work out what each page should hold.
  // It even asks pageCount how many pages to try, so if pageCount is wrong,
  // the last page is never tried and the test still passes
  it("pages", () => {
    const items = ["a", "b", "c", "d", "e"];
    for (let number = 1; number <= pageCount(items.length, 2); number++) {
      const start = (number - 1) * 2;
      expect(page(items, number, 2)).to.deep.equal(items.slice(start, start + 2));
    }
  });

  // Good: the pages, and what they hold, written out
  it("makes 3 pages of 2 from 5 items", () => {
    const count = pageCount(5, 2);
    expect(count).to.equal(3);
  });

  it("holds the first items on the first page", () => {
    const shown = page(["a", "b", "c", "d", "e"], 1, 2);
    expect(shown).to.deep.equal(["a", "b"]);
  });

  it("holds what is left on the last page", () => {
    const shown = page(["a", "b", "c", "d", "e"], 3, 2);
    expect(shown).to.deep.equal(["e"]);
  });

  it("refuses a page past the end", () => {
    expect(() => page(["a", "b", "c", "d", "e"], 4, 2)).to.throw("No such page");
  });

  it("refuses a page size of 0", () => {
    expect(() => pageCount(5, 0)).to.throw("Page size must be at least 1");
  });
});
