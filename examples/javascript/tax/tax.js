class Tax {
  constructor(rate) {
    this.rate = rate;
  }

  on(amount) {
    return amount * this.rate / 100;
  }
}

function totalWithTax(prices, tax) {
  let total = 0;
  for (const price of prices) total += price;
  // A change to try: tax each price in the loop. The totals stay the same
  return total + tax.on(total);
}

module.exports = { Tax, totalWithTax };
