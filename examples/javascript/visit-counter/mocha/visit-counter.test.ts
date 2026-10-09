import { expect } from "chai";
import * as sinon from "sinon";
import { VisitCounter } from "./visit-counter";

// Fake: counts kept in an object
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
  // Bad: a mock told what get returns. It cannot show visits adding up
  it("adds one for a visit", () => {
    const store = { get: sinon.stub().returns(4), set: sinon.stub() };
    expect(new VisitCounter(store).visit("home")).to.equal(5);
    expect(store.set.calledOnceWith("home", 5)).to.equal(true);
  });

  // Good: the fake
  it("counts two visits as two", () => {
    const counter = new VisitCounter(new FakeStore());
    counter.visit("home");
    const count = counter.visit("home");
    expect(count).to.equal(2);
  });

  it("counts each page apart", () => {
    const counter = new VisitCounter(new FakeStore());
    counter.visit("home");
    const count = counter.visit("about");
    expect(count).to.equal(1);
  });
});
