// Shared by every caller: it lives as long as the program does
const counter = { next: 1 };

function takeTicket() {
  const number = counter.next;
  // A bug to try: counter.next += 2;
  counter.next += 1;
  return number;
}

function reset() {
  counter.next = 1;
}

module.exports = { takeTicket, reset };
