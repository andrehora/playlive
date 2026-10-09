export class GuestList {
  private guests: string[] = [];

  add(name: string): void {
    this.guests.push(name);
  }

  count(): number {
    return this.guests.length;
  }
}
