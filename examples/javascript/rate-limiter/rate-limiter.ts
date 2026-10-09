// Allows at most `limit` calls in any `window` milliseconds
export class RateLimiter {
  private calls: number[] = [];

  constructor(private limit: number, private window: number, private clock: () => number = Date.now) {}

  allow(): boolean {
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
