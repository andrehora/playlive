// Ours: the rule, which tests should run for real
const rules = {
  isOpen(hour) {
    return hour >= 9 && hour < 17;
  },
};

// A system boundary: the real clock moves on, so tests replace it
class Clock {
  hour() {
    return new Date().getHours();
  }
}

function sign(clock) {
  // A bug to try: if (rules.isOpen(clock.hour() + 1)) {
  if (rules.isOpen(clock.hour())) {
    return "Come in";
  }
  return "Sorry, we're closed";
}

module.exports = { rules, Clock, sign };
