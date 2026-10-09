export function ticketPrice(age: number, day: string): number {
  // A bug to try: if (age <= 12) {
  if (age < 12) {
    return 5;
  }
  if (day === "Tuesday") {
    return 6;
  }
  return 10;
}
