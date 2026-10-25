export class Counter {
  value = 0;

  increment(): void {
    this.value += 1;
  }

  decrement(): void {
    if (this.value === 0) {
      return;
    }
    this.value -= 1;
  }

  reset(): void {
    this.value = 0;
  }
}
