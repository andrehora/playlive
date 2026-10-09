const { VisitCounter } = require("./visit-counter");

// Fake: counts kept in an object
class FakeStore {
  counts = {};

  get(key) {
    return this.counts[key] ?? 0;
  }

  set(key, value) {
    this.counts[key] = value;
  }
}

describe("Visit counter", () => {
  // Bad: a mock told what get returns. It cannot show visits adding up
  it("adds one for a visit", () => {
    const store = jasmine.createSpyObj("store", { get: 4, set: undefined });
    expect(new VisitCounter(store).visit("home")).toBe(5);
    expect(store.set).toHaveBeenCalledOnceWith("home", 5);
  });

  // Good: the fake
  it("counts two visits as two", () => {
    const counter = new VisitCounter(new FakeStore());
    counter.visit("home");
    const count = counter.visit("home");
    expect(count).toBe(2);
  });

  it("counts each page apart", () => {
    const counter = new VisitCounter(new FakeStore());
    counter.visit("home");
    const count = counter.visit("about");
    expect(count).toBe(1);
  });
});
