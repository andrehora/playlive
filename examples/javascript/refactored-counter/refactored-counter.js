class Counter {
  constructor() {
    this.value = 0;
    this.history = [];
  }

  increment() {
    this._save();
    this.value += 1;
  }

  decrement() {
    if (this.value === 0) {
      return;
    }
    this._save();
    this.value -= 1;
  }

  reset() {
    this._save();
    this.value = 0;
  }

  undo() {
    if (this.history.length) {
      this.value = this.history.pop();
    }
  }

  _save() {
    this.history.push(this.value);
  }
}

module.exports = { Counter };
