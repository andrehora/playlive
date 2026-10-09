class TipJar {
  constructor() {
    // Private: the leading _ says it is not for callers
    // A change to try: keep a running total in this._total instead of a list
    this._tips = [];
  }

  add(amount) {
    if (amount <= 0) {
      throw new Error("A tip must be positive");
    }
    this._tips.push(amount);
  }

  total() {
    let total = 0;
    for (const tip of this._tips) total += tip;
    return total;
  }
}

module.exports = { TipJar };
