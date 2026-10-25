import { expect } from "chai";
import { Counter } from "./fixed-counter";

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
});
