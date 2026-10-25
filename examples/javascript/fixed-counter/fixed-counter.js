class Counter {
  constructor() {
    this.value = 0;
  }

  increment() {
    this.value += 1;
  }

  decrement() {
    if (this.value === 0) {
      return;
    }
    this.value -= 1;
  }

  reset() {
    this.value = 0;
  }
}

module.exports = { Counter };
