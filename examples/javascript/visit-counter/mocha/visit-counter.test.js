const { expect } = require("chai");
const sinon = require("sinon");
const { VisitCounter } = require("./visit-counter");

// Good: a fake, counts kept in an object. As cheap as a mock, and it behaves
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
  // Bad: a mock told what get returns. To show two visits adding up it would
  // have to be told each answer in turn
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
