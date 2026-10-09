export interface Report {
  student: string;
  average: number;
  passed: boolean;
}

export class Gradebook {
  constructor(private scores: Record<string, number[]>) {}

  add(student: string, score: number): void {
    if (score < 0 || score > 100) {
      throw new Error("Score must be between 0 and 100");
    }
    const scores = this.scores[student] ?? [];
    scores.push(score);
    this.scores[student] = scores;
  }

  average(student: string): number {
    const scores = this.scores[student] ?? [];
    if (!scores.length) {
      throw new Error("No scores for " + student);
    }
    let total = 0;
    for (const score of scores) total += score;
    return total / scores.length;
  }

  report(student: string): Report {
    const average = this.average(student);
    // A change to try: add the student's best score to the report
    return { student, average, passed: average >= 50 };
  }
}
