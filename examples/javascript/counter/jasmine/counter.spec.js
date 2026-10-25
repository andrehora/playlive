const { Counter } = require("./counter");

describe("Counter", () => {
  it("starts at zero", () => {
    const counter = new Counter();
    expect(counter.value).toBe(0);
  });

  it("increment adds one", () => {
    const counter = new Counter();
    counter.increment();
    expect(counter.value).toBe(1);
  });

  it("multiple increments", () => {
    const counter = new Counter();
    counter.increment();
    counter.increment();
    counter.increment();
    expect(counter.value).toBe(3);
  });

  it("increment and decrement", () => {
    const counter = new Counter();
    counter.increment();
    counter.decrement();
    expect(counter.value).toBe(0);
  });

  it("reset goes back to zero", () => {
    const counter = new Counter();
    counter.increment();
    counter.increment();
    counter.reset();
    expect(counter.value).toBe(0);
  });
});
