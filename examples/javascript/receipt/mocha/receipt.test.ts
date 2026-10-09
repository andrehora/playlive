import { expect } from "chai";
import { receipt } from "./receipt";

describe("Receipt", () => {
  // Bad: it compares every line, so a new line on the receipt breaks it, though
  // nothing it is about changed
  it("prints the receipt", () => {
    expect(receipt([["Tea", 3], ["Cake", 4]])).to.deep.equal(["Tea: 3", "Cake: 4", "Total: 7"]);
  });

  // Good: each test looks for the line it is about, so new lines leave it alone
  it("shows the total", () => {
    const lines = receipt([["Tea", 3], ["Cake", 4]]);
    expect(lines).to.include("Total: 7");
  });

  it("shows each item", () => {
    const lines = receipt([["Tea", 3], ["Cake", 4]]);
    expect(lines).to.include("Cake: 4");
  });
});
