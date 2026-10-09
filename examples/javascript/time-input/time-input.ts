// "HH:MM" as minutes since midnight
export function parseTime(text: string): number {
  text = text.trim();
  if (!text) {
    throw new Error("Time is required");
  }
  const parts = text.split(":");
  if (parts.length !== 2) {
    throw new Error("Use the form HH:MM");
  }
  const [hours, minutes] = parts;
  if (!/^\d+$/.test(hours) || !/^\d+$/.test(minutes)) {
    throw new Error("Use digits only");
  }
  const h = Number(hours), m = Number(minutes);
  // A bug to try: if (h > 24 || m > 59) {
  if (h > 23 || m > 59) {
    throw new Error("No such time");
  }
  return h * 60 + m;
}
