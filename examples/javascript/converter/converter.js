class Converter {
  // In the app, bankService asks a bank for today's rate
  constructor(bankService) {
    this.bankService = bankService;
  }

  toEuros(dollars) {
    return dollars * this.bankService.rate("EUR");
  }
}

module.exports = { Converter };
