export class Order {
  constructor(private prices: number[]) {}

  // Private: callers cannot reach it
  // A rename to try: sum, here and in total()
  private subtotal(): number {
    let subtotal = 0;
    for (const price of this.prices) subtotal += price;
    return subtotal;
  }

  // Shipping costs 5, and is free from 50
  total(): number {
    const subtotal = this.subtotal();
    if (subtotal >= 50) {
      return subtotal;
    }
    return subtotal + 5;
  }
}
