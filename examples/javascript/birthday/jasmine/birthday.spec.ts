import { birthdayMessages, sendGreetings } from "./birthday";

describe("Birthday", () => {
  // The real clock comes back after each test, even one that fails
  afterEach(() => {
    jasmine.clock().uninstall();
  });

  // Bad: sendGreetings reads the real date, so the test has to fake the clock,
  // and knows how sendGreetings reads it
  it("greets on the day", () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date("2026-10-09T08:00:00Z"));
    const mailer = jasmine.createSpyObj("mailer", ["send"]);
    expect(sendGreetings([["Ana", "1990-10-09"]], mailer)).toBe(1);
    expect(mailer.send).toHaveBeenCalledOnceWith("Happy birthday, Ana!");
  });

  // Good: birthdayMessages is handed the day, so the tests just compare
  it("greets someone born today", () => {
    const employees: [string, string][] = [["Ana", "1990-10-09"], ["Ben", "1985-03-02"]];
    const messages = birthdayMessages(employees, "2026-10-09");
    expect(messages).toEqual(["Happy birthday, Ana!"]);
  });

  it("greets no one on an ordinary day", () => {
    const employees: [string, string][] = [["Ana", "1990-10-09"], ["Ben", "1985-03-02"]];
    const messages = birthdayMessages(employees, "2026-06-01");
    expect(messages).toEqual([]);
  });
});
