// Rainfall in millimetres, one reading a day
function total(readings) {
  let result = 0;
  for (const reading of readings) {
    result += reading;
  }
  return result;
}

function average(readings) {
  return total(readings) / readings.length;
}

module.exports = { total, average };
