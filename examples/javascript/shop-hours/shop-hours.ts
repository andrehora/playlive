// Ours: the rule, which tests should run for real
export const rules = {
  isOpen(hour: number): boolean {
    return hour >= 9 && hour < 17;
  },
};

// A system boundary: the real clock moves on, so tests replace it
export class Clock {
  hour(): number {
    return new Date().getHours();
  }
}

export function sign(clock: Clock): string {
  // A bug to try: if (rules.isOpen(clock.hour() + 1)) {
  if (rules.isOpen(clock.hour())) {
    return "Come in";
  }
  return "Sorry, we're closed";
}
