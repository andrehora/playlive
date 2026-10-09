import { page, pageCount } from "./pagination";

describe("Pagination", () => {
  // Bad: a loop that asks the code for its own answers, so its bugs slip through
  it("pages", () => {
    const items = ["a", "b", "c", "d", "e"];
    for (let number = 1; number <= pageCount(items.length, 2); number++) {
      const start = (number - 1) * 2;
      expect(page(items, number, 2)).toEqual(items.slice(start, start + 2));
    }
  });

  // Good: the pages, and what they hold, written out
  it("makes 3 pages of 2 from 5 items", () => {
    const count = pageCount(5, 2);
    expect(count).toBe(3);
  });

  it("holds the first items on the first page", () => {
    const shown = page(["a", "b", "c", "d", "e"], 1, 2);
    expect(shown).toEqual(["a", "b"]);
  });

  it("holds what is left on the last page", () => {
    const shown = page(["a", "b", "c", "d", "e"], 3, 2);
    expect(shown).toEqual(["e"]);
  });

  it("refuses a page past the end", () => {
    expect(() => page(["a", "b", "c", "d", "e"], 4, 2)).toThrowError("No such page");
  });

  it("refuses a page size of 0", () => {
    expect(() => pageCount(5, 0)).toThrowError("Page size must be at least 1");
  });
});
