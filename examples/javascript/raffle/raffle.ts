export function draw(names: string[], rand: () => number = Math.random): string {
  if (!names.length) {
    throw new Error("No one entered");
  }
  // A bug to try: return names[Math.floor(rand() * (names.length - 1))];
  return names[Math.floor(rand() * names.length)];
}
