import { expect } from "chai";
import * as sinon from "sinon";
import { rules, sign } from "./shop-hours";

describe("Shop hours", () => {
  // Bad: it mocks isOpen, our own rule, so the rule is never tested. At 22:00
  // the shop is closed, yet the sign says come in
  it("says come in", () => {
    const rule = sinon.stub(rules, "isOpen").returns(true);
    const clock = { hour: sinon.stub().returns(22) };
    const said = sign(clock);
    rule.restore();
    expect(said).to.equal("Come in");
  });

  // Good: only the clock, the boundary, is replaced; the rule runs for real
  it("is open from 9", () => {
    const clock = { hour: sinon.stub().returns(9) };
    const text = sign(clock);
    expect(text).to.equal("Come in");
  });

  it("is closed before 9", () => {
    const clock = { hour: sinon.stub().returns(8) };
    const text = sign(clock);
    expect(text).to.equal("Sorry, we're closed");
  });

  it("is closed from 17", () => {
    const clock = { hour: sinon.stub().returns(17) };
    const text = sign(clock);
    expect(text).to.equal("Sorry, we're closed");
  });
});
