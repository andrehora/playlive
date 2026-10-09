export function receipt(items: [string, number][]): string[] {
  // A change to try: const lines = ["Thanks for shopping"];
  const lines: string[] = [];
  let total = 0;
  for (const [name, price] of items) {
    lines.push(name + ": " + price);
    total += price;
  }
  lines.push("Total: " + total);
  return lines;
}
