import { expect } from "chai";
import { reset, takeTicket } from "./ticket-counter";

// Bad: these two share the counter. Run the second alone and it fails
describe("Shared ticket counter", () => {
  it("gives ticket 1 first", () => {
    expect(takeTicket()).to.equal(1);
  });

  it("gives ticket 2 next", () => {
    expect(takeTicket()).to.equal(2);
  });
});

// Good: each test resets the counter first
describe("Ticket counter", () => {
  beforeEach(() => {
    reset();
  });

  it("starts a fresh counter at 1", () => {
    const ticket = takeTicket();
    expect(ticket).to.equal(1);
  });

  it("counts tickets up", () => {
    takeTicket();
    const ticket = takeTicket();
    expect(ticket).to.equal(2);
  });
});
