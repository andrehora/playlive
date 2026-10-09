export class Menu {
  constructor(private prices: Record<string, number>) {}

  priceOf(item: string): number {
    // A bug to try: return this.prices[item] * 2;
    return this.prices[item];
  }
}

export function bill(items: string[], menu: Menu): number {
  let total = 0;
  for (const item of items) total += menu.priceOf(item);
  return total;
}
