class Converter {
  // In the app, rates asks a bank for today's rate
  constructor(rates) {
    this.rates = rates;
  }

  toEuros(dollars) {
    return dollars * this.rates.rate("EUR");
  }
}

module.exports = { Converter };
