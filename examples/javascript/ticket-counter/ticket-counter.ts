// Shared by every caller: it lives as long as the program does
const counter = { next: 1 };

export function takeTicket(): number {
  const number = counter.next;
  // A bug to try: counter.next += 2;
  counter.next += 1;
  return number;
}

export function reset(): void {
  counter.next = 1;
}
