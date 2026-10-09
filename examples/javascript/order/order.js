class Order {
  constructor(prices) {
    this._prices = prices;
  }

  // Private: the leading _ says it is not for callers
  // A rename to try: _sum, here and in total()
  _subtotal() {
    let subtotal = 0;
    for (const price of this._prices) subtotal += price;
    return subtotal;
  }

  // Shipping costs 5, and is free from 50
  total() {
    const subtotal = this._subtotal();
    if (subtotal >= 50) {
      return subtotal;
    }
    return subtotal + 5;
  }
}

module.exports = { Order };
