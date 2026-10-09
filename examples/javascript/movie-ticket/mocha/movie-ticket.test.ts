import { expect } from "chai";
import { ticketPrice } from "./movie-ticket";

// Bad: a table and a helper, so the test says nothing by itself
const CASES: [number, string, number][] = [[8, "Friday", 5], [30, "Tuesday", 6], [30, "Friday", 10]];

function check(i: number) {
  const [age, day, price] = CASES[i];
  expect(ticketPrice(age, day)).to.equal(price);
}

describe("Movie ticket", () => {
  it("prices", () => {
    check(0);
    check(1);
    check(2);
  });

  // Good: each test says who goes, when, and what they pay
  it("charges children under 12 5", () => {
    const price = ticketPrice(8, "Friday");
    expect(price).to.equal(5);
  });

  it("charges a 12-year-old full price", () => {
    const price = ticketPrice(12, "Friday");
    expect(price).to.equal(10);
  });

  it("charges 6 on Tuesdays", () => {
    const price = ticketPrice(30, "Tuesday");
    expect(price).to.equal(6);
  });

  it("charges adults 10", () => {
    const price = ticketPrice(30, "Friday");
    expect(price).to.equal(10);
  });
});
