// Easy to test: the day is handed in, as "YYYY-MM-DD"
function birthdays(employees, today) {
  return employees.filter(([, born]) => born.slice(5) === today.slice(5)).map(([name]) => name);
}

function birthdayMessages(employees, today) {
  const messages = [];
  for (const name of birthdays(employees, today)) messages.push("Happy birthday, " + name + "!");
  return messages;
}

// Hard to test: it reads the real date. Kept thin, so there is little to test
function sendGreetings(employees, mailer) {
  const today = new Date().toISOString().slice(0, 10);
  const messages = birthdayMessages(employees, today);
  for (const message of messages) mailer.send(message);
  return messages.length;
}

module.exports = { birthdayMessages, sendGreetings };
