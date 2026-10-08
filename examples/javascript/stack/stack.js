class Stack {
  constructor() {
    this.items = [];
  }

  push(item) {
    this.items.push(item);
  }

  pop() {
    if (!this.items.length) {
      throw new Error("Pop from an empty stack");
    }
    return this.items.pop();
  }

  peek() {
    return this.items.at(-1);
  }

  get size() {
    return this.items.length;
  }
}

module.exports = { Stack };
