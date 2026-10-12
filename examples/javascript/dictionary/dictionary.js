// Loading a real dictionary takes a while
class Dictionary {
  constructor(entries) {
    this.entries = entries;
  }

  define(word) {
    return this.entries[word.toLowerCase()];
  }
}

module.exports = { Dictionary };
