import { expect } from "chai";
import { parseTime } from "./time-input";

describe("Time input", () => {
  // Bad: only the happy path
  it("reads a time", () => {
    expect(parseTime("09:30")).to.equal(570);
  });

  // Good: the unhappy paths and the edges too
  it("refuses an empty time", () => {
    expect(() => parseTime("  ")).to.throw("Time is required");
  });

  it("refuses a time without a colon", () => {
    expect(() => parseTime("930")).to.throw("Use the form HH:MM");
  });

  it("refuses letters", () => {
    expect(() => parseTime("ab:cd")).to.throw("Use digits only");
  });

  it("refuses hour 24", () => {
    expect(() => parseTime("24:00")).to.throw("No such time");
  });

  it("refuses minute 60", () => {
    expect(() => parseTime("12:60")).to.throw("No such time");
  });

  it("reads midnight as 0", () => {
    const minutes = parseTime("00:00");
    expect(minutes).to.equal(0);
  });

  it("reads the last minute of the day as 1439", () => {
    const minutes = parseTime("23:59");
    expect(minutes).to.equal(1439);
  });
});
