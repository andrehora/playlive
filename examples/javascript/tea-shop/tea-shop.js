class Menu {
  constructor(prices) {
    this.prices = prices;
  }

  priceOf(item) {
    // A bug to try: return this.prices[item] * 2;
    return this.prices[item];
  }
}

function bill(items, menu) {
  let total = 0;
  for (const item of items) total += menu.priceOf(item);
  return total;
}

module.exports = { Menu, bill };
