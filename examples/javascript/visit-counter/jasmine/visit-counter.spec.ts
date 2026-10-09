import { VisitCounter } from "./visit-counter";

// Good: a fake, counts kept in an object. As cheap as a mock, and it behaves
class FakeStore {
  counts: Record<string, number> = {};

  get(key: string) {
    return this.counts[key] ?? 0;
  }

  set(key: string, value: number) {
    this.counts[key] = value;
  }
}

describe("Visit counter", () => {
  // Bad: a mock told what get returns. To show two visits adding up it would
  // have to be told each answer in turn
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
