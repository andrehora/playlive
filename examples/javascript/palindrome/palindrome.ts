export function isPalindrome(text: string): boolean {
  const letters = text.toLowerCase().replace(/[^a-z]/g, "");
  return letters === [...letters].reverse().join("");
}
