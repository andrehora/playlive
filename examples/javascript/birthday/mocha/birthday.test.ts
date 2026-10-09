import { expect } from "chai";
import * as sinon from "sinon";
import { birthdayMessages, sendGreetings } from "./birthday";

describe("Birthday", () => {
  // Put the real clock back after each test
  afterEach(() => {
    sinon.restore();
  });

  // Bad: sendGreetings reads the real date, so the test must fake the clock
  it("greets on the day", () => {
    sinon.useFakeTimers(new Date("2026-10-09T08:00:00Z"));
    const mailer = { send: sinon.stub() };
    expect(sendGreetings([["Ana", "1990-10-09"]], mailer)).to.equal(1);
    expect(mailer.send.calledOnceWith("Happy birthday, Ana!")).to.equal(true);
  });

  // Good: birthdayMessages is handed the day
  it("greets someone born today", () => {
    const employees: [string, string][] = [["Ana", "1990-10-09"], ["Ben", "1985-03-02"]];
    const messages = birthdayMessages(employees, "2026-10-09");
    expect(messages).to.deep.equal(["Happy birthday, Ana!"]);
  });

  it("greets no one on an ordinary day", () => {
    const employees: [string, string][] = [["Ana", "1990-10-09"], ["Ben", "1985-03-02"]];
    const messages = birthdayMessages(employees, "2026-06-01");
    expect(messages).to.deep.equal([]);
  });
});
