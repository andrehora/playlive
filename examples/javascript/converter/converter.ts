export interface BankService {
  rate(currency: string): number;
}

export class Converter {
  // In the app, bankService asks a bank for today's rate
  constructor(private bankService: BankService) {}

  toEuros(dollars: number): number {
    return dollars * this.bankService.rate("EUR");
  }
}
