const { birthdayMessages, sendGreetings } = require("./birthday");

describe("Birthday", () => {
  // Put the real clock back after each test
  afterEach(() => {
    jasmine.clock().uninstall();
  });

  // Bad: sendGreetings reads the real date, so the test must fake the clock
  it("greets on the day", () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date("2026-10-09T08:00:00Z"));
    const mailer = jasmine.createSpyObj("mailer", ["send"]);
    expect(sendGreetings([["Ana", "1990-10-09"]], mailer)).toBe(1);
    expect(mailer.send).toHaveBeenCalledOnceWith("Happy birthday, Ana!");
  });

  // Good: birthdayMessages is handed the day
  it("greets someone born today", () => {
    const employees = [["Ana", "1990-10-09"], ["Ben", "1985-03-02"]];
    const messages = birthdayMessages(employees, "2026-10-09");
    expect(messages).toEqual(["Happy birthday, Ana!"]);
  });

  it("greets no one on an ordinary day", () => {
    const employees = [["Ana", "1990-10-09"], ["Ben", "1985-03-02"]];
    const messages = birthdayMessages(employees, "2026-06-01");
    expect(messages).toEqual([]);
  });
});
