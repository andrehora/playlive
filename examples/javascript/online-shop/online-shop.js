class Inventory {
  constructor(stock) {
    this.stock = stock;
  }

  available(item) {
    return this.stock[item] ?? 0;
  }

  take(item, count) {
    if (count > this.available(item)) {
      throw new Error("Not enough " + item);
    }
    this.stock[item] = this.available(item) - count;
  }
}

class Prices {
  constructor(prices) {
    this.prices = prices;
  }

  cost(item, count) {
    // A bug to try: return this.prices[item] * (count - 1);
    return this.prices[item] * count;
  }
}

class Shop {
  constructor(inventory, prices) {
    this.inventory = inventory;
    this.prices = prices;
  }

  // A change to try: work out the cost first. The results are the same
  order(item, count) {
    this.inventory.take(item, count);
    return this.prices.cost(item, count);
  }
}

module.exports = { Inventory, Prices, Shop };
