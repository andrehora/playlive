export class InsufficientFunds extends Error {}

export class Account {
  constructor(public balance = 0) {}

  deposit(amount: number): void {
    if (amount <= 0) {
      throw new Error("Deposit must be positive");
    }
    this.balance += amount;
  }

  withdraw(amount: number): void {
    if (amount > this.balance) {
      throw new InsufficientFunds(`Balance is ${this.balance}, cannot withdraw ${amount}`);
    }
    this.balance -= amount;
  }
}
