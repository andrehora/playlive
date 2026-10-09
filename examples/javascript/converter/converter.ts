export interface Rates {
  rate(currency: string): number;
}

export class Converter {
  // In the app, rates asks a bank for today's rate
  constructor(private rates: Rates) {}

  toEuros(dollars: number): number {
    return dollars * this.rates.rate("EUR");
  }
}
