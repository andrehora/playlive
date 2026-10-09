export interface Mailer {
  send(email: string, total: number): void;
}

export class Invoice {
  constructor(private prices: number[], private mailer: Mailer) {}

  total(): number {
    let total = 0;
    for (const price of this.prices) {
      total += price;
    }
    return total;
  }

  send(email: string): void {
    this.mailer.send(email, this.total());
  }
}
