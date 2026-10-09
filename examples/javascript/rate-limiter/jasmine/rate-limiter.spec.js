const { RateLimiter } = require("./rate-limiter");

describe("Rate limiter", () => {
  // Bad: it uses the real clock, so it passes only if the three calls land within
  // one second (a slow machine fails it), and checking the window running out
  // would mean really waiting
  it("limits calls on the real clock", () => {
    const limiter = new RateLimiter(2, 1000);
    limiter.allow();
    limiter.allow();
    expect(limiter.allow()).toBe(false);
  });

  // Good: the limiter is handed a clock the test sets, so every run is the same
  it("allows calls up to the limit", () => {
    const clock = { now: 0 };
    const limiter = new RateLimiter(2, 60, () => clock.now);
    limiter.allow();
    const allowed = limiter.allow();
    expect(allowed).toBe(true);
  });

  it("refuses a call over the limit", () => {
    const clock = { now: 0 };
    const limiter = new RateLimiter(2, 60, () => clock.now);
    limiter.allow();
    limiter.allow();
    const allowed = limiter.allow();
    expect(allowed).toBe(false);
  });

  it("allows calls again once the window has passed", () => {
    const clock = { now: 0 };
    const limiter = new RateLimiter(2, 60, () => clock.now);
    limiter.allow();
    limiter.allow();
    clock.now = 60;
    const allowed = limiter.allow();
    expect(allowed).toBe(true);
  });
});
