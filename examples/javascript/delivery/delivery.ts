// Orders ship the same day, but not at the weekend
export function shipsToday(today?: Date): boolean {
  if (today === undefined) {
    today = new Date();
  }
  const day = today.toLocaleDateString("en-US", { weekday: "long" });
  return day !== "Saturday" && day !== "Sunday";
}
