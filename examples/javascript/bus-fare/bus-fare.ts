// A bus ticket: children under 12 pay half
export function fare(age: number): number {
  if (age < 12) {
    return 1;
  }
  return 2;
}
