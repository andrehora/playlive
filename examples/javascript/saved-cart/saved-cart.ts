export type Items = Record<string, number>;

export interface Store {
  load(): Items;
  save(items: Items): void;
}

// A real store, cheap enough to use in tests: it keeps a copy, as a database would
export class MemoryStore implements Store {
  private saved: Items = {};

  load(): Items {
    return { ...this.saved };
  }

  save(items: Items): void {
    this.saved = { ...items };
  }
}

// A cart kept in a store between visits
export class Cart {
  private items: Items;

  constructor(private store: Store) {
    this.items = store.load();
  }

  // A change to try: save only the items' names, and a count of each, as a
  // list of [name, count] pairs. Load them back the same way
  add(item: string, count: number): void {
    if (count < 1) {
      throw new Error("Add at least 1");
    }
    this.items[item] = (this.items[item] ?? 0) + count;
    this.store.save(this.items);
  }

  remove(item: string): void {
    delete this.items[item];
    this.store.save(this.items);
  }

  count(): number {
    let n = 0;
    for (const c of Object.values(this.items)) n += c;
    return n;
  }
}
