import { expect } from "chai";
import { GuestList } from "./guest-list";

// Bad: the first two tests share one list, so the second passes only after
// the first. Run it alone (its Run button) and it fails
const shared = new GuestList();

describe("Guest list", () => {
  it("adds a guest", () => {
    shared.add("Ana");
    expect(shared.count()).to.equal(1);
  });

  it("makes two with another guest", () => {
    shared.add("Ben");
    expect(shared.count()).to.equal(2);
  });

  // Good: each test makes its own list, so it passes alone or in any order
  it("starts empty", () => {
    const guests = new GuestList();
    expect(guests.count()).to.equal(0);
  });

  it("counts two guests", () => {
    const guests = new GuestList();
    guests.add("Ana");
    guests.add("Ben");
    expect(guests.count()).to.equal(2);
  });
});
