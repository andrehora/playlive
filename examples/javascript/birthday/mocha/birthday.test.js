const { expect } = require("chai");
const sinon = require("sinon");
const { birthdayMessages, sendGreetings } = require("./birthday");

describe("Birthday", () => {
  // The real clock comes back after each test, even one that fails
  afterEach(() => {
    sinon.restore();
  });

  // Bad: sendGreetings reads the real date, so the test has to fake the clock,
  // and knows how sendGreetings reads it
  it("greets on the day", () => {
    sinon.useFakeTimers(new Date("2026-10-09T08:00:00Z"));
    const mailer = { send: sinon.stub() };
    expect(sendGreetings([["Ana", "1990-10-09"]], mailer)).to.equal(1);
    expect(mailer.send.calledOnceWith("Happy birthday, Ana!")).to.equal(true);
  });

  // Good: birthdayMessages is handed the day, so the tests just compare
  it("greets someone born today", () => {
    const employees = [["Ana", "1990-10-09"], ["Ben", "1985-03-02"]];
    const messages = birthdayMessages(employees, "2026-10-09");
    expect(messages).to.deep.equal(["Happy birthday, Ana!"]);
  });

  it("greets no one on an ordinary day", () => {
    const employees = [["Ana", "1990-10-09"], ["Ben", "1985-03-02"]];
    const messages = birthdayMessages(employees, "2026-06-01");
    expect(messages).to.deep.equal([]);
  });
});
