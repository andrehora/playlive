import { expect } from "chai";
import { clock, greet } from "./greeting";

// The real clock changes, so the tests replace it with a fixed hour,
// and put the real one back after each test
describe("Greeting", () => {
  const realHour = clock.hour;

  afterEach(() => {
    clock.hour = realHour;
  });

  it("says good morning", () => {
    clock.hour = () => 9;
    expect(greet("Ana")).to.equal("Good morning, Ana");
  });

  it("says good afternoon", () => {
    clock.hour = () => 15;
    expect(greet("Ana")).to.equal("Good afternoon, Ana");
  });

  it("says good evening", () => {
    clock.hour = () => 20;
    expect(greet("Ana")).to.equal("Good evening, Ana");
  });
});
