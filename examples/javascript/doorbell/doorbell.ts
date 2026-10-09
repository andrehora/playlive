export interface Phone {
  notify(message: string): void;
}

export class Doorbell {
  private muted = false;

  // In the app, phone sends a notification to the owner's phone
  constructor(private phone: Phone) {}

  mute(): void {
    this.muted = true;
  }

  ring(visitor: string): void {
    if (!this.muted) {
      this.phone.notify(visitor + " is at the door");
    }
  }
}
