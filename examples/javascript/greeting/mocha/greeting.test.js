const { expect } = require("chai");
const sinon = require("sinon");
const { clock, greet } = require("./greeting");

// The real clock changes, so the tests replace it with a fixed hour
describe("Greeting", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("says good morning", () => {
    sinon.stub(clock, "hour").returns(9);
    expect(greet("Ana")).to.equal("Good morning, Ana");
  });

  it("says good afternoon", () => {
    sinon.stub(clock, "hour").returns(15);
    expect(greet("Ana")).to.equal("Good afternoon, Ana");
  });

  it("says good evening", () => {
    sinon.stub(clock, "hour").returns(20);
    expect(greet("Ana")).to.equal("Good evening, Ana");
  });
});
