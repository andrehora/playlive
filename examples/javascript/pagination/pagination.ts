export function pageCount(total: number, size: number): number {
  if (size < 1) {
    throw new Error("Page size must be at least 1");
  }
  // A bug to try: return Math.floor(total / size);
  return Math.ceil(total / size);
}

export function page<T>(items: T[], number: number, size: number): T[] {
  if (number < 1 || number > pageCount(items.length, size)) {
    throw new Error("No such page");
  }
  const start = (number - 1) * size;
  return items.slice(start, start + size);
}
