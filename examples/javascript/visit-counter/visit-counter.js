class VisitCounter {
  constructor(store) {
    this.store = store;
  }

  visit(page) {
    const count = this.store.get(page) + 1;
    this.store.set(page, count);
    return count;
  }
}

module.exports = { VisitCounter };
