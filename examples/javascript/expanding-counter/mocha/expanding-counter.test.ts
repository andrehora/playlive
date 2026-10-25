import { expect } from "chai";
import { Counter } from "./expanding-counter";

describe("Counter", () => {
  it("starts at zero", () => {
    const counter = new Counter();
    expect(counter.value).to.equal(0);
  });

  it("increment adds one", () => {
    const counter = new Counter();
    counter.increment();
    expect(counter.value).to.equal(1);
  });

  it("multiple increments", () => {
    const counter = new Counter();
    counter.increment();
    counter.increment();
    counter.increment();
    expect(counter.value).to.equal(3);
  });

  it("increment and decrement", () => {
    const counter = new Counter();
    counter.increment();
    counter.decrement();
    expect(counter.value).to.equal(0);
  });

  it("reset goes back to zero", () => {
    const counter = new Counter();
    counter.increment();
    counter.increment();
    counter.reset();
    expect(counter.value).to.equal(0);
  });

  it("stops decrementing at zero", () => {
    const counter = new Counter();
    counter.decrement();
    expect(counter.value).to.equal(0);
  });

  it("undo reverts increment", () => {
    const counter = new Counter();
    counter.increment();
    counter.undo();
    expect(counter.value).to.equal(0);
  });

  it("undo reverts reset", () => {
    const counter = new Counter();
    counter.increment();
    counter.increment();
    counter.reset();
    counter.undo();
    expect(counter.value).to.equal(2);
  });

  it("undo with nothing to undo", () => {
    const counter = new Counter();
    counter.undo();
    expect(counter.value).to.equal(0);
  });

  it("multiple undos", () => {
    const counter = new Counter();
    counter.increment();
    counter.increment();
    counter.increment();
    counter.undo();
    counter.undo();
    expect(counter.value).to.equal(1);
  });
});
