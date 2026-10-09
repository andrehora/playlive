export interface Store {
  get(key: string): number;
  set(key: string, value: number): void;
}

export class VisitCounter {
  constructor(private store: Store) {}

  visit(page: string): number {
    const count = this.store.get(page) + 1;
    this.store.set(page, count);
    return count;
  }
}
