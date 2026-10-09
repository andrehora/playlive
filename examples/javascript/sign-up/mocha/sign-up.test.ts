import { expect } from "chai";
import * as sinon from "sinon";
import { SignUp } from "./sign-up";

// Fake: users kept in a list
class FakeUsers {
  emails: string[] = [];

  exists(email: string) {
    return this.emails.includes(email);
  }

  save(email: string) {
    this.emails.push(email);
  }
}

describe("Sign-up", () => {
  // Bad: a mock only knows what it was told
  it("registers a new email", () => {
    const users = { exists: sinon.stub().returns(false), save: sinon.stub() };
    expect(new SignUp(users).register("ana@example.test")).to.equal("Welcome, ana@example.test");
    expect(users.save.calledOnceWith("ana@example.test")).to.equal(true);
  });

  // Good: the fake
  it("welcomes a new email", () => {
    const signUp = new SignUp(new FakeUsers());
    const message = signUp.register("ana@example.test");
    expect(message).to.equal("Welcome, ana@example.test");
  });

  it("lets an email register only once", () => {
    const signUp = new SignUp(new FakeUsers());
    signUp.register("ana@example.test");
    expect(() => signUp.register("ana@example.test")).to.throw("Email already registered");
  });
});
