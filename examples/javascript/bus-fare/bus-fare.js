// A bus ticket: children under 12 pay half
function fare(age) {
  if (age < 12) {
    return 1;
  }
  return 2;
}

module.exports = { fare };
