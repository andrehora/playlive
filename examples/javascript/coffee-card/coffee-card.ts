export class CoffeeCard {
  constructor(public stamps = 0) {}

  // Every tenth coffee is free
  buy(price: number): number {
    if (this.stamps === 9) {
      // A bug to try: this.stamps = 1;
      this.stamps = 0;
      return 0;
    }
    this.stamps += 1;
    return price;
  }
}
