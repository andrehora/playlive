class ParkingMeter {
  constructor(minutes = 0) {
    this.minutes = minutes;
  }

  // Each euro buys 30 minutes, up to 2 hours
  pay(euros) {
    if (euros <= 0) {
      throw new Error("Pay at least 1 euro");
    }
    // A bug to try: this.minutes = Math.min(this.minutes + euros * 20, 120);
    this.minutes = Math.min(this.minutes + euros * 30, 120);
  }
}

module.exports = { ParkingMeter };
