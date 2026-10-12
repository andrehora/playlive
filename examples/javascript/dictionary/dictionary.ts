// Loading a real dictionary takes a while
export class Dictionary {
  entries: Record<string, string>;

  constructor(entries: Record<string, string>) {
    this.entries = entries;
  }

  define(word: string): string | undefined {
    return this.entries[word.toLowerCase()];
  }
}
