const { Library } = require("./library");

// Bad: the helpers hide who borrows, how many books, and the limit
function libraryWithLoans(n) {
  const library = new Library();
  for (let i = 0; i < n; i++) library.lend("ana", "Book " + i);
  return library;
}

function lendOneMore(library) {
  library.lend("ana", "One more");
  return library.count("ana");
}

describe("Library", () => {
  it("lends", () => {
    expect(lendOneMore(libraryWithLoans(2))).toBe(3);
  });

  // Good: each test shows all it needs, even if steps repeat
  it("lends a member a book", () => {
    const library = new Library(3);
    library.lend("Ana", "Dune");
    expect(library.count("Ana")).toBe(1);
  });

  it("refuses a member at the limit", () => {
    const library = new Library(2);
    library.lend("Ana", "Dune");
    library.lend("Ana", "Emma");
    expect(() => library.lend("Ana", "Ulysses")).toThrowError("Limit reached");
  });

  it("keeps each member's books apart", () => {
    const library = new Library(1);
    library.lend("Ana", "Dune");
    library.lend("Ben", "Dune");
    expect(library.count("Ben")).toBe(1);
  });
});
