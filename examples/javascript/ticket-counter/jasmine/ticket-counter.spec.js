const { reset, takeTicket } = require("./ticket-counter");

// Bad: these two count on the counter as the tests before them left it, so
// the second passes only right after the first. Run it alone and it fails
describe("Shared ticket counter", () => {
  it("gives ticket 1 first", () => {
    expect(takeTicket()).toBe(1);
  });

  it("gives ticket 2 next", () => {
    expect(takeTicket()).toBe(2);
  });
});

// Good: each test puts the counter back first, so what ran before it does not matter
describe("Ticket counter", () => {
  beforeEach(() => {
    reset();
  });

  it("starts a fresh counter at 1", () => {
    const ticket = takeTicket();
    expect(ticket).toBe(1);
  });

  it("counts tickets up", () => {
    takeTicket();
    const ticket = takeTicket();
    expect(ticket).toBe(2);
  });
});
