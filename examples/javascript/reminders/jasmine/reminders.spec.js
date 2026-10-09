const { rules, remind } = require("./reminders");

describe("Reminders", () => {
  // Bad: it mocks isOverdue, our own rule, so the rule is never tested. This
  // invoice is due on day 10 and today is day 5, yet a reminder goes out
  it("sends a reminder", () => {
    spyOn(rules, "isOverdue").and.returnValue(true);
    const mailer = jasmine.createSpyObj("mailer", ["send"]);
    expect(remind("ana@example.test", 10, 5, mailer)).toBe(true);
  });

  // Good: only the mailer, the boundary, is mocked; the rule runs for real
  it("reminds about an overdue invoice", () => {
    const mailer = jasmine.createSpyObj("mailer", ["send"]);
    const sent = remind("ana@example.test", 10, 11, mailer);
    expect(sent).toBe(true);
    expect(mailer.send).toHaveBeenCalledOnceWith("ana@example.test", "Your invoice is overdue");
  });

  it("does not remind about an invoice due today", () => {
    const mailer = jasmine.createSpyObj("mailer", ["send"]);
    const sent = remind("ana@example.test", 10, 10, mailer);
    expect(sent).toBe(false);
    expect(mailer.send).not.toHaveBeenCalled();
  });
});
