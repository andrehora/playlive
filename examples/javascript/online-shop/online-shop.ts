export class Inventory {
  constructor(private stock: Record<string, number>) {}

  available(item: string): number {
    return this.stock[item] ?? 0;
  }

  take(item: string, count: number): void {
    if (count > this.available(item)) {
      throw new Error("Not enough " + item);
    }
    this.stock[item] = this.available(item) - count;
  }
}

export class Prices {
  constructor(private prices: Record<string, number>) {}

  cost(item: string, count: number): number {
    // A bug to try: return this.prices[item] * (count - 1);
    return this.prices[item] * count;
  }
}

export class Shop {
  constructor(private inventory: Inventory, private prices: Prices) {}

  // A change to try: work out the cost first. The results are the same
  order(item: string, count: number): number {
    this.inventory.take(item, count);
    return this.prices.cost(item, count);
  }
}
