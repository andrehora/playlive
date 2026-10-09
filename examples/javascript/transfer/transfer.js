class Account {
  constructor(balance) {
    this.balance = balance;
  }

  deposit(amount) {
    this.balance += amount;
  }

  transfer(to, amount) {
    if (amount > this.balance) {
      throw new Error("Not enough money");
    }
    this.balance -= amount;
    // A change to try: to.balance += amount, skipping deposit
    to.deposit(amount);
  }
}

module.exports = { Account };
