import { expect } from "chai";
import * as sinon from "sinon";
import { rules, remind } from "./reminders";

describe("Reminders", () => {
  // Bad: it mocks isOverdue, our own rule, so the rule is never tested
  it("sends a reminder", () => {
    const rule = sinon.stub(rules, "isOverdue").returns(true);
    const mailer = { send: sinon.stub() };
    const sent = remind("ana@example.test", 10, 5, mailer);
    rule.restore();
    expect(sent).to.equal(true);
  });

  // Good: only the mailer, the boundary, is mocked
  it("reminds about an overdue invoice", () => {
    const mailer = { send: sinon.stub() };
    const sent = remind("ana@example.test", 10, 11, mailer);
    expect(sent).to.equal(true);
    expect(mailer.send.calledOnceWith("ana@example.test", "Your invoice is overdue")).to.equal(true);
  });

  it("does not remind about an invoice due today", () => {
    const mailer = { send: sinon.stub() };
    const sent = remind("ana@example.test", 10, 10, mailer);
    expect(sent).to.equal(false);
    expect(mailer.send.called).to.equal(false);
  });
});
