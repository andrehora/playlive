class GuestList {
  constructor() {
    this.guests = [];
  }

  add(name) {
    this.guests.push(name);
  }

  count() {
    return this.guests.length;
  }
}

module.exports = { GuestList };
