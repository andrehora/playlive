export type Letter = "A" | "B" | "C" | "F";

export function letter(score: number): Letter {
  if (score < 0 || score > 100) {
    throw new RangeError("Score must be between 0 and 100");
  }
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  return "F";
}
