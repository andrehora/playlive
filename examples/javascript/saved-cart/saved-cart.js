// A real store, cheap enough to use in tests: it keeps a copy, as a database would
class MemoryStore {
  constructor() {
    this.saved = {};
  }

  load() {
    return { ...this.saved };
  }

  save(items) {
    this.saved = { ...items };
  }
}

// A cart kept in a store between visits
class Cart {
  constructor(store) {
    this.store = store;
    this.items = store.load();
  }

  // A change to try: save only the items' names, and a count of each, as a
  // list of [name, count] pairs. Load them back the same way
  add(item, count) {
    if (count < 1) {
      throw new Error("Add at least 1");
    }
    this.items[item] = (this.items[item] ?? 0) + count;
    this.store.save(this.items);
  }

  remove(item) {
    delete this.items[item];
    this.store.save(this.items);
  }

  count() {
    let n = 0;
    for (const c of Object.values(this.items)) n += c;
    return n;
  }
}

module.exports = { MemoryStore, Cart };
