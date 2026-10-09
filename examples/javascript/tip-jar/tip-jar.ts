export class TipJar {
  // Private: callers cannot reach it
  // A change to try: keep a running total in this.sum instead of a list
  private tips: number[] = [];

  add(amount: number): void {
    if (amount <= 0) {
      throw new Error("A tip must be positive");
    }
    this.tips.push(amount);
  }

  total(): number {
    let total = 0;
    for (const tip of this.tips) total += tip;
    return total;
  }
}
