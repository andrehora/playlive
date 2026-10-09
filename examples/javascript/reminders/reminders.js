// Ours: the rule, which tests should run for real
const rules = {
  isOverdue(dueDay, today) {
    return today > dueDay;
  },
};

// A system boundary: the real mailer sends email, so tests mock it
class Mailer {
  send(to, text) {
    throw new Error(`No mail server in tests (${to}: ${text})`);
  }
}

function remind(email, dueDay, today, mailer) {
  // A bug to try: if (rules.isOverdue(today, dueDay)) {
  if (rules.isOverdue(dueDay, today)) {
    mailer.send(email, "Your invoice is overdue");
    return true;
  }
  return false;
}

module.exports = { rules, Mailer, remind };
