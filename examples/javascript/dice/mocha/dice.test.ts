import { expect } from "chai";
import { roll } from "./dice";

describe("Dice", () => {
  it("rolls a whole number", () => {
    expect(Number.isInteger(roll())).to.equal(true);
  });

  it("rolls from 1 to 6", () => {
    const value = roll();
    expect(value).to.be.at.least(1);
    expect(value).to.be.below(6);
  });
});
