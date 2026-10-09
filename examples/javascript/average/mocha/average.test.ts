import { expect } from "chai";
import * as sinon from "sinon";
import { average, printAverage } from "./average";

describe("Average", () => {
  // Bad: it tests through console.log, so any change to the wording breaks it
  it("prints the average", () => {
    const log = sinon.stub(console, "log");
    printAverage([6, 9]);
    log.restore();
    expect(log.calledWith("Average:", 7.5)).to.equal(true);
  });

  // Good: average returns its result, so the tests just compare
  it("averages the scores", () => {
    const mean = average([6, 9]);
    expect(mean).to.equal(7.5);
  });

  it("averages no scores as zero", () => {
    const mean = average([]);
    expect(mean).to.equal(0);
  });
});
