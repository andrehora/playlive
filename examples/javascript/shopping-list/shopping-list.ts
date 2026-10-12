export function parse(text: string): string[] {
  return text.split(", ");
}

export function summary(items: string[]): { count: number; first: string } {
  return { count: items.length, first: items[0] };
}
