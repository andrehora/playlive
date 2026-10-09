export interface Sender {
  send(to: string, text: string): void;
}

export class Mailer implements Sender {
  // In the app, it sends a real email
  send(to: string, text: string): void {
    throw new Error(`No mail server in tests (${to}: ${text})`);
  }
}

export function invite(emails: string[], mailer: Sender): void {
  for (const email of emails) {
    if (email !== "") {
      mailer.send(email, "You're invited!");
    }
  }
}
