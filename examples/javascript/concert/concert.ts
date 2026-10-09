export class Concert {
  private sold = 0;

  constructor(private capacity: number, private price: number) {}

  seatsLeft(): number {
    return this.capacity - this.sold;
  }

  // 10% off for 5 tickets or more
  buy(count: number): number {
    if (count < 1) {
      throw new Error("Buy at least 1 ticket");
    }
    if (count > this.seatsLeft()) {
      throw new Error("Not enough seats left");
    }
    this.sold += count;
    let cost = count * this.price;
    if (count >= 5) {
      // A bug to try: cost = cost * 80 / 100;
      cost = cost * 90 / 100;
    }
    return cost;
  }
}
