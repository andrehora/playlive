import { expect } from "chai";
import * as sinon from "sinon";
import { Newsletter, Subscribers } from "./newsletter";

describe("Newsletter", () => {
  // Bad: it checks that add was called, not that Ana is subscribed
  it("calls add when subscribing", () => {
    const store = { add: sinon.stub(), size: sinon.stub() };
    new Newsletter(store, { send: sinon.stub() }).subscribe("ana@example.test");
    expect(store.add.calledOnceWith("ana@example.test")).to.equal(true);
  });

  // Good: it checks the result, with a real store
  it("counts a subscriber", () => {
    const newsletter = new Newsletter(new Subscribers(), { send: sinon.stub() });
    newsletter.subscribe("ana@example.test");
    expect(newsletter.count()).to.equal(1);
  });

  // Good too: the email is the behavior, so checking the call is right
  it("sends a subscriber a welcome", () => {
    const mailer = { send: sinon.stub() };
    new Newsletter(new Subscribers(), mailer).subscribe("ana@example.test");
    expect(mailer.send.calledOnceWith("ana@example.test", "Welcome to the newsletter")).to.equal(true);
  });
});
