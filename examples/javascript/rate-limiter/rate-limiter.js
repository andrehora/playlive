// Allows at most `limit` calls in any `window` milliseconds
class RateLimiter {
  constructor(limit, window, clock = Date.now) {
    this.limit = limit;
    this.window = window;
    this.clock = clock;
    this.calls = [];
  }

  allow() {
    const now = this.clock();
    this.calls = this.calls.filter((t) => now - t < this.window);
    // A bug to try: if (this.calls.length > this.limit) {
    if (this.calls.length >= this.limit) {
      return false;
    }
    this.calls.push(now);
    return true;
  }
}

module.exports = { RateLimiter };
