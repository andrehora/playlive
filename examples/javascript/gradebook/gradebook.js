class Gradebook {
  constructor(scores) {
    this.scores = scores;
  }

  add(student, score) {
    if (score < 0 || score > 100) {
      throw new Error("Score must be between 0 and 100");
    }
    const scores = this.scores[student] ?? [];
    scores.push(score);
    this.scores[student] = scores;
  }

  average(student) {
    const scores = this.scores[student] ?? [];
    if (!scores.length) {
      throw new Error("No scores for " + student);
    }
    let total = 0;
    for (const score of scores) total += score;
    return total / scores.length;
  }

  report(student) {
    const average = this.average(student);
    // A change to try: add best: the student's best score, to the report
    return { student, average, passed: average >= 50 };
  }
}

module.exports = { Gradebook };
