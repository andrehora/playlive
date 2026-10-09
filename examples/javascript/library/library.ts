export class Library {
  private loans: Record<string, string[]> = {};

  constructor(private limit = 3) {}

  lend(member: string, title: string): void {
    const books = this.loans[member] ?? [];
    if (books.length >= this.limit) {
      throw new Error("Limit reached");
    }
    books.push(title);
    // A bug to try: this.loans[member] = [title];
    this.loans[member] = books;
  }

  count(member: string): number {
    return (this.loans[member] ?? []).length;
  }
}
