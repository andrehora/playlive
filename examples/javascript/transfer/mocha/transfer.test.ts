import { expect } from "chai";
import * as sinon from "sinon";
import { Account } from "./transfer";

describe("Transfer", () => {
  // Bad: it checks that deposit was called, not that the money arrived, so moving
  // it another way breaks the test though both balances come out the same
  it("calls deposit", () => {
    const to = { deposit: sinon.stub() };
    new Account(100).transfer(to, 30);
    expect(to.deposit.calledOnceWith(30)).to.equal(true);
  });

  // Good: it checks the balances, the result anyone would look at
  it("moves the money in", () => {
    const ana = new Account(100), ben = new Account(0);
    ana.transfer(ben, 30);
    expect(ben.balance).to.equal(30);
  });

  it("moves the money out", () => {
    const ana = new Account(100), ben = new Account(0);
    ana.transfer(ben, 30);
    expect(ana.balance).to.equal(70);
  });

  it("moves nothing when refused", () => {
    const ana = new Account(10), ben = new Account(0);
    expect(() => ana.transfer(ben, 30)).to.throw("Not enough money");
    expect(ben.balance).to.equal(0);
  });
});
