class InsufficientFunds extends Error {}

class Account {
  constructor(balance = 0) {
    this.balance = balance;
  }

  deposit(amount) {
    if (amount <= 0) {
      throw new Error("Deposit must be positive");
    }
    this.balance += amount;
  }

  withdraw(amount) {
    if (amount > this.balance) {
      throw new InsufficientFunds(`Balance is ${this.balance}, cannot withdraw ${amount}`);
    }
    this.balance -= amount;
  }
}

module.exports = { Account, InsufficientFunds };
