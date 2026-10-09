// What water is at a temperature in °C
function state(celsius) {
  if (celsius <= 0) {
    return "ice";
  }
  if (celsius >= 100) {
    return "steam";
  }
  return "water";
}

module.exports = { state };
