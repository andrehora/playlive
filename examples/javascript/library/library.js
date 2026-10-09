class Library {
  constructor(limit = 3) {
    this.limit = limit;
    this.loans = {};
  }

  lend(member, title) {
    const books = this.loans[member] ?? [];
    if (books.length >= this.limit) {
      throw new Error("Limit reached");
    }
    books.push(title);
    // A bug to try: this.loans[member] = [title];
    this.loans[member] = books;
  }

  count(member) {
    return (this.loans[member] ?? []).length;
  }
}

module.exports = { Library };
