export class Account {
  constructor(public balance: number) {}

  deposit(amount: number): void {
    this.balance += amount;
  }

  transfer(to: Account, amount: number): void {
    if (amount > this.balance) {
      throw new Error("Not enough money");
    }
    this.balance -= amount;
    // A change to try: to.balance += amount, skipping deposit
    to.deposit(amount);
  }
}
