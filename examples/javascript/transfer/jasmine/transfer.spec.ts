import { Account } from "./transfer";

describe("Transfer", () => {
  // Bad: it checks that deposit was called, not that the money arrived
  it("calls deposit", () => {
    const to = jasmine.createSpyObj("to", ["deposit"]);
    new Account(100).transfer(to, 30);
    expect(to.deposit).toHaveBeenCalledOnceWith(30);
  });

  // Good: it checks the balances
  it("moves the money in", () => {
    const ana = new Account(100), ben = new Account(0);
    ana.transfer(ben, 30);
    expect(ben.balance).toBe(30);
  });

  it("moves the money out", () => {
    const ana = new Account(100), ben = new Account(0);
    ana.transfer(ben, 30);
    expect(ana.balance).toBe(70);
  });

  it("moves nothing when refused", () => {
    const ana = new Account(10), ben = new Account(0);
    expect(() => ana.transfer(ben, 30)).toThrowError("Not enough money");
    expect(ben.balance).toBe(0);
  });
});
