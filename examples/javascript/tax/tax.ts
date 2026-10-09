export class Tax {
  constructor(private rate: number) {}

  on(amount: number): number {
    return amount * this.rate / 100;
  }
}

export function totalWithTax(prices: number[], tax: Tax): number {
  let total = 0;
  for (const price of prices) total += price;
  // A change to try: tax each price in the loop. The totals stay the same
  return total + tax.on(total);
}
