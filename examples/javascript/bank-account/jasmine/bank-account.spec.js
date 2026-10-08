const { Account, InsufficientFunds } = require("./bank-account");

describe("Account", () => {
  it("adds a deposit to the balance", () => {
    const account = new Account(100);
    account.deposit(50);
    expect(account.balance).toBe(150);
  });

  it("refuses to withdraw too much", () => {
    const account = new Account(100);
    expect(() => account.withdraw(150)).toThrowError(InsufficientFunds);
  });

  it("leaves the balance alone after a refused withdrawal", () => {
    const account = new Account(100);
    expect(() => account.withdraw(150)).toThrowError(InsufficientFunds);
    expect(account.balance).toBe(100);
  });
});
