class CoffeeCard {
  constructor(stamps = 0) {
    this.stamps = stamps;
  }

  // Every tenth coffee is free
  buy(price) {
    if (this.stamps === 9) {
      // A bug to try: this.stamps = 1;
      this.stamps = 0;
      return 0;
    }
    this.stamps += 1;
    return price;
  }
}

module.exports = { CoffeeCard };
