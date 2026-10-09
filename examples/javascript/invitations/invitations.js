class Mailer {
  // In the app, it sends a real email
  send(to, text) {
    throw new Error(`No mail server in tests (${to}: ${text})`);
  }
}

function invite(emails, mailer) {
  for (const email of emails) {
    if (email !== "") {
      mailer.send(email, "You're invited!");
    }
  }
}

module.exports = { Mailer, invite };
