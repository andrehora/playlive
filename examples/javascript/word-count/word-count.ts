export function countWords(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (let word of text.toLowerCase().split(/\s+/).filter(w => w)) {
    word = word.replace(/^[.,!?]+|[.,!?]+$/g, "");
    counts[word] = (counts[word] ?? 0) + 1;
  }
  return counts;
}
