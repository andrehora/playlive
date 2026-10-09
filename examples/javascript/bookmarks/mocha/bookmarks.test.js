const { expect } = require("chai");
const { Bookmarks } = require("./bookmarks");

// Fake: a simple store that really works, in a list
class FakeStore {
  urls = [];

  has(url) {
    return this.urls.includes(url);
  }

  save(url) {
    this.urls.push(url);
  }

  all() {
    return [...this.urls];
  }
}

describe("Bookmarks", () => {
  let bookmarks;

  beforeEach(() => {
    bookmarks = new Bookmarks(new FakeStore());
  });

  it("saves each new bookmark", () => {
    bookmarks.add("news.example");
    bookmarks.add("recipes.example");
    expect(bookmarks.all()).to.deep.equal(["news.example", "recipes.example"]);
  });

  it("saves a bookmark only once", () => {
    bookmarks.add("maps.example");
    bookmarks.add("maps.example");
    expect(bookmarks.all()).to.deep.equal(["maps.example"]);
  });
});
