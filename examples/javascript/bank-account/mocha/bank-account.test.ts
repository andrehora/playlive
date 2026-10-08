import { expect } from "chai";
import { Account, InsufficientFunds } from "./bank-account";

describe("Account", () => {
  it("adds a deposit to the balance", () => {
    const account = new Account(100);
    account.deposit(50);
    expect(account.balance).to.equal(150);
  });

  it("refuses to withdraw too much", () => {
    const account = new Account(100);
    expect(() => account.withdraw(150)).to.throw(InsufficientFunds);
  });

  it("leaves the balance alone after a refused withdrawal", () => {
    const account = new Account(100);
    expect(() => account.withdraw(150)).to.throw(InsufficientFunds);
    expect(account.balance).to.equal(100);
  });
});
