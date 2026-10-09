import { invite, Sender } from "./invitations";

// Spy, by hand: counts the emails instead of sending them
class SpyMailer implements Sender {
  sent = 0;

  send(): void {
    this.sent += 1;
  }
}

describe("Invitations", () => {
  let mailer: SpyMailer;

  beforeEach(() => {
    mailer = new SpyMailer();
  });

  it("emails each guest", () => {
    invite(["ana@example.test", "ben@example.test"], mailer);
    expect(mailer.sent).toBe(2);
  });

  it("sends no email to a blank address", () => {
    invite(["ana@example.test", ""], mailer);
    expect(mailer.sent).toBe(1);
  });

  it("sends no email when there are no guests", () => {
    invite([], mailer);
    expect(mailer.sent).toBe(0);
  });
});
