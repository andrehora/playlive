import { Bookmarks, Store } from "./bookmarks";

// Fake: a simple store that really works, in a list
class FakeStore implements Store {
  urls: string[] = [];

  has(url: string) {
    return this.urls.includes(url);
  }

  save(url: string) {
    this.urls.push(url);
  }

  all() {
    return [...this.urls];
  }
}

describe("Bookmarks", () => {
  let bookmarks: Bookmarks;

  beforeEach(() => {
    bookmarks = new Bookmarks(new FakeStore());
  });

  it("saves each new bookmark", () => {
    bookmarks.add("news.example");
    bookmarks.add("recipes.example");
    expect(bookmarks.all()).toEqual(["news.example", "recipes.example"]);
  });

  it("saves a bookmark only once", () => {
    bookmarks.add("maps.example");
    bookmarks.add("maps.example");
    expect(bookmarks.all()).toEqual(["maps.example"]);
  });

  it("counts each bookmark once", () => {
    bookmarks.add("news.example");
    bookmarks.add("news.example");
    bookmarks.add("maps.example");
    expect(bookmarks.total()).toBe(2);
  });
});
