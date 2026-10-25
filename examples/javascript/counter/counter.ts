export class Counter {
  value = 0;

  increment(): void {
    this.value += 1;
  }

  decrement(): void {
    this.value -= 1;
  }

  reset(): void {
    this.value = 0;
  }
}
