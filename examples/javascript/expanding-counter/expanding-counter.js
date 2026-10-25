class Counter {
  constructor() {
    this.value = 0;
    this.history = [];
  }

  increment() {
    this.history.push(this.value);
    this.value += 1;
  }

  decrement() {
    if (this.value > 0) {
      this.history.push(this.value);
      this.value -= 1;
    }
  }

  reset() {
    this.history.push(this.value);
    this.value = 0;
  }

  undo() {
    if (this.history.length) {
      this.value = this.history.pop();
    }
  }
}

module.exports = { Counter };
