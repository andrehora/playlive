const { expect } = require("chai");
const { invite } = require("./invitations");

// Spy, by hand: counts the emails instead of sending them
class SpyMailer {
  constructor() {
    this.sent = 0;
  }

  send() {
    this.sent += 1;
  }
}

describe("Invitations", () => {
  let mailer;

  beforeEach(() => {
    mailer = new SpyMailer();
  });

  it("emails each guest", () => {
    invite(["ana@example.test", "ben@example.test"], mailer);
    expect(mailer.sent).to.equal(2);
  });

  it("sends no email to a blank address", () => {
    invite(["ana@example.test", ""], mailer);
    expect(mailer.sent).to.equal(1);
  });

  it("sends no email when there are no guests", () => {
    invite([], mailer);
    expect(mailer.sent).to.equal(0);
  });
});
