class Invoice {
  constructor(prices, mailer) {
    this.prices = prices;
    this.mailer = mailer;
  }

  total() {
    let total = 0;
    for (const price of this.prices) {
      total += price;
    }
    return total;
  }

  send(email) {
    this.mailer.send(email, this.total());
  }
}

module.exports = { Invoice };
