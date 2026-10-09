import { expect } from "chai";
import { receipt } from "./receipt";

describe("Receipt", () => {
  // Bad: it compares every line, so any new line breaks it
  it("prints the receipt", () => {
    expect(receipt([["Tea", 3], ["Cake", 4]])).to.deep.equal(["Tea: 3", "Cake: 4", "Total: 7"]);
  });

  // Good: each test looks only for its own line
  it("shows the total", () => {
    const lines = receipt([["Tea", 3], ["Cake", 4]]);
    expect(lines).to.include("Total: 7");
  });

  it("shows each item", () => {
    const lines = receipt([["Tea", 3], ["Cake", 4]]);
    expect(lines).to.include("Cake: 4");
  });
});
