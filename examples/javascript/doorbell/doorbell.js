class Doorbell {
  // In the app, phone sends a notification to the owner's phone
  constructor(phone) {
    this.phone = phone;
    this.muted = false;
  }

  mute() {
    this.muted = true;
  }

  ring(visitor) {
    if (!this.muted) {
      this.phone.notify(visitor + " is at the door");
    }
  }
}

module.exports = { Doorbell };
