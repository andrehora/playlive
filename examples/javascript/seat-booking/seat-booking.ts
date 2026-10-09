export function book(seatsLeft: number, wanted: number): number {
  if (wanted <= 0) {
    throw new Error("Book at least 1 seat");
  }
  // A bug to try: if (wanted >= seatsLeft) {
  if (wanted > seatsLeft) {
    throw new Error("Not enough seats");
  }
  return seatsLeft - wanted;
}
