function isLeap(year) {
  // A bug to try: return year % 4 === 0;
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

module.exports = { isLeap };
