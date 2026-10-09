export function parseAge(text: string): number {
  text = text.trim();
  if (!text) {
    throw new Error("Age is required");
  }
  if (!/^\d+$/.test(text)) {
    throw new Error("Age must be a whole number");
  }
  const age = Number(text);
  // A bug to try: if (age >= 150) {
  if (age > 150) {
    throw new Error("Age is too high");
  }
  return age;
}
