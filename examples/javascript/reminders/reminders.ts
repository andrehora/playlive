// Ours: the rule, which tests should run for real
export const rules = {
  isOverdue(dueDay: number, today: number): boolean {
    return today > dueDay;
  },
};

// A system boundary: the real mailer sends email, so tests mock it
export class Mailer {
  send(to: string, text: string): void {
    throw new Error(`No mail server in tests (${to}: ${text})`);
  }
}

export function remind(email: string, dueDay: number, today: number, mailer: Mailer): boolean {
  // A bug to try: if (rules.isOverdue(today, dueDay)) {
  if (rules.isOverdue(dueDay, today)) {
    mailer.send(email, "Your invoice is overdue");
    return true;
  }
  return false;
}
