class Cart {
  constructor() {
    this.items = new Map();
    this.discount = 0;
  }

  add(name, price, qty = 1) {
    if (qty < 1) {
      throw new Error("Quantity must be at least 1");
    }
    const held = this.items.has(name) ? this.items.get(name).qty : 0;
    this.items.set(name, { price, qty: held + qty });
  }

  remove(name) {
    this.items.delete(name);
  }

  count() {
    let n = 0;
    for (const { qty } of this.items.values()) n += qty;
    return n;
  }

  applyCoupon(code) {
    if (code !== "SAVE10") {
      throw new Error("Unknown coupon");
    }
    this.discount = 10;
  }

  total() {
    let subtotal = 0;
    for (const { price, qty } of this.items.values()) subtotal += price * qty;
    return Math.round(subtotal * (100 - this.discount)) / 100;
  }
}

module.exports = { Cart };
