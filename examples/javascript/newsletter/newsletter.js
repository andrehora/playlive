// A real store, cheap enough to use in tests: a list that remembers
class Subscribers {
  constructor() {
    this.emails = [];
  }

  add(email) {
    this.emails.push(email);
  }

  size() {
    return this.emails.length;
  }
}

class Newsletter {
  constructor(store, mailer) {
    this.store = store;
    this.mailer = mailer;
  }

  subscribe(email) {
    // A change to try: give Subscribers an addAll(emails), and call
    // this.store.addAll([email]) here instead
    this.store.add(email);
    this.mailer.send(email, "Welcome to the newsletter");
  }

  count() {
    return this.store.size();
  }
}

module.exports = { Subscribers, Newsletter };
