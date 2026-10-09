class Bookmarks {
  // In the app, the store is a database
  constructor(store) {
    this.store = store;
  }

  add(url) {
    if (!this.store.has(url)) {
      this.store.save(url);
    }
  }

  all() {
    return this.store.all();
  }
}

module.exports = { Bookmarks };
