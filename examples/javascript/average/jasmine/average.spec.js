const { average, printAverage } = require("./average");

describe("Average", () => {
  // Bad: it tests through console.log, so it has to catch the output, and any
  // change to the wording breaks it
  it("prints the average", () => {
    spyOn(console, "log");
    printAverage([6, 9]);
    expect(console.log).toHaveBeenCalledWith("Average:", 7.5);
  });

  // Good: average returns its result, so the tests just compare it
  it("averages the scores", () => {
    const mean = average([6, 9]);
    expect(mean).toBe(7.5);
  });

  it("averages no scores as zero", () => {
    const mean = average([]);
    expect(mean).toBe(0);
  });
});
