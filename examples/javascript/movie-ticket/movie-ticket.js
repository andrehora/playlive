function ticketPrice(age, day) {
  // A bug to try: if (age <= 12) {
  if (age < 12) {
    return 5;
  }
  if (day === "Tuesday") {
    return 6;
  }
  return 10;
}

module.exports = { ticketPrice };
