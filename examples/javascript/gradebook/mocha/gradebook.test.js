const { expect } = require("chai");
const { Gradebook } = require("./gradebook");

describe("Gradebook", () => {
  // Bad: it compares the whole report, so a new field breaks it
  it("reports on a student", () => {
    const book = new Gradebook({ Ana: [60, 80] });
    expect(book.report("Ana")).to.deep.equal({ student: "Ana", average: 70, passed: true });
  });

  // Good: each test checks only what it is about
  it("gives the average in the report", () => {
    const book = new Gradebook({ Ana: [60, 80] });
    const average = book.report("Ana").average;
    expect(average).to.equal(70);
  });

  it("passes an average of 50", () => {
    const book = new Gradebook({ Ben: [40, 60] });
    const passed = book.report("Ben").passed;
    expect(passed).to.equal(true);
  });

  it("fails an average below 50", () => {
    const book = new Gradebook({ Cy: [30, 60] });
    const passed = book.report("Cy").passed;
    expect(passed).to.equal(false);
  });

  it("counts an added score", () => {
    const book = new Gradebook({});
    book.add("Ana", 90);
    const average = book.average("Ana");
    expect(average).to.equal(90);
  });

  it("refuses a score over 100", () => {
    const book = new Gradebook({});
    expect(() => book.add("Ana", 101)).to.throw("Score must be between 0 and 100");
  });

  it("has no average for a student with no scores", () => {
    const book = new Gradebook({});
    expect(() => book.average("Dee")).to.throw("No scores for Dee");
  });
});
