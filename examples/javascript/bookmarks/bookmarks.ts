export interface Store {
  has(url: string): boolean;
  save(url: string): void;
  all(): string[];
}

export class Bookmarks {
  // In the app, the store is a database
  constructor(private store: Store) {}

  add(url: string): void {
    if (!this.store.has(url)) {
      this.store.save(url);
    }
  }

  all(): string[] {
    return this.store.all();
  }
}
