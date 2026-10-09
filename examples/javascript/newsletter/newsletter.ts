export interface Mailer {
  send(to: string, text: string): void;
}

// A real store, cheap enough for tests: a list
export class Subscribers {
  private emails: string[] = [];

  add(email: string): void {
    this.emails.push(email);
  }

  size(): number {
    return this.emails.length;
  }
}

export class Newsletter {
  constructor(private store: Subscribers, private mailer: Mailer) {}

  subscribe(email: string): void {
    // A change to try: call a new this.store.addAll([email]) here instead
    this.store.add(email);
    this.mailer.send(email, "Welcome to the newsletter");
  }

  count(): number {
    return this.store.size();
  }
}
