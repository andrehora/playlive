export interface Mailer {
  send(text: string): void;
}

// Easy to test: who has a birthday on a given day ("YYYY-MM-DD"), handed in
function birthdays(employees: [string, string][], today: string): string[] {
  return employees.filter(([, born]) => born.slice(5) === today.slice(5)).map(([name]) => name);
}

export function birthdayMessages(employees: [string, string][], today: string): string[] {
  const messages: string[] = [];
  for (const name of birthdays(employees, today)) messages.push("Happy birthday, " + name + "!");
  return messages;
}

// Hard to test: it reads the real date itself, so a test has to fake the clock.
// It says how many it sent. Keeping it this thin leaves almost nothing in it to test
export function sendGreetings(employees: [string, string][], mailer: Mailer): number {
  const today = new Date().toISOString().slice(0, 10);
  const messages = birthdayMessages(employees, today);
  for (const message of messages) mailer.send(message);
  return messages.length;
}
