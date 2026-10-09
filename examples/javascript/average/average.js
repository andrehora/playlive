// Easy to test: it takes the scores and returns the result
function average(scores) {
  if (!scores.length) {
    return 0;
  }
  let total = 0;
  for (const score of scores) total += score;
  return total / scores.length;
}

// Hard to test: it prints. Kept thin, so there is little to test
function printAverage(scores) {
  // A change to try: console.log("Mean:", average(scores));
  console.log("Average:", average(scores));
}

module.exports = { average, printAverage };
