const { parseTime } = require("./time-input");

describe("Time input", () => {
  // Bad: only the happy path. Empty, a missing colon, letters, hours and minutes
  // out of range, and the first and last minute of the day are never tried
  it("reads a time", () => {
    expect(parseTime("09:30")).toBe(570);
  });

  // Good: the unhappy paths and the edges too
  it("refuses an empty time", () => {
    expect(() => parseTime("  ")).toThrowError("Time is required");
  });

  it("refuses a time without a colon", () => {
    expect(() => parseTime("930")).toThrowError("Use the form HH:MM");
  });

  it("refuses letters", () => {
    expect(() => parseTime("ab:cd")).toThrowError("Use digits only");
  });

  it("refuses hour 24", () => {
    expect(() => parseTime("24:00")).toThrowError("No such time");
  });

  it("refuses minute 60", () => {
    expect(() => parseTime("12:60")).toThrowError("No such time");
  });

  it("reads midnight as 0", () => {
    const minutes = parseTime("00:00");
    expect(minutes).toBe(0);
  });

  it("reads the last minute of the day as 1439", () => {
    const minutes = parseTime("23:59");
    expect(minutes).toBe(1439);
  });
});
