export class Counter {
  value = 0;
  history: number[] = [];

  increment(): void {
    this.history.push(this.value);
    this.value += 1;
  }

  decrement(): void {
    if (this.value > 0) {
      this.history.push(this.value);
      this.value -= 1;
    }
  }

  reset(): void {
    this.history.push(this.value);
    this.value = 0;
  }

  undo(): void {
    if (this.history.length) {
      this.value = this.history.pop() as number;
    }
  }
}
