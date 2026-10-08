interface Line {
  price: number;
  qty: number;
}

export class Cart {
  private items = new Map<string, Line>();
  private discount = 0;

  add(name: string, price: number, qty = 1): void {
    if (qty < 1) {
      throw new Error("Quantity must be at least 1");
    }
    const held = this.items.get(name)?.qty ?? 0;
    this.items.set(name, { price, qty: held + qty });
  }

  remove(name: string): void {
    this.items.delete(name);
  }

  count(): number {
    let n = 0;
    for (const { qty } of this.items.values()) n += qty;
    return n;
  }

  applyCoupon(code: string): void {
    if (code !== "SAVE10") {
      throw new Error("Unknown coupon");
    }
    this.discount = 10;
  }

  total(): number {
    let subtotal = 0;
    for (const { price, qty } of this.items.values()) subtotal += price * qty;
    return Math.round(subtotal * (100 - this.discount)) / 100;
  }
}
