const { Concert } = require("./concert");

// Bad: helpers hide the concert, so the test reads as bare numbers
function smallConcert() {
  return new Concert(10, 20);
}

function buyAndCheck(concert, count, cost, left) {
  expect(concert.buy(count)).toBe(cost);
  expect(concert.seatsLeft()).toBe(left);
}

describe("Concert", () => {
  it("buys", () => {
    const concert = smallConcert();
    buyAndCheck(concert, 2, 40, 8);
    buyAndCheck(concert, 5, 90, 3);
  });

  // Good: each test shows the concert, what is bought, and the result
  it("charges the price for each ticket", () => {
    const concert = new Concert(10, 20);
    const cost = concert.buy(2);
    expect(cost).toBe(40);
  });

  it("takes 10% off 5 tickets or more", () => {
    const concert = new Concert(10, 20);
    const cost = concert.buy(5);
    expect(cost).toBe(90);
  });

  it("takes bought seats away", () => {
    const concert = new Concert(10, 20);
    concert.buy(4);
    expect(concert.seatsLeft()).toBe(6);
  });

  it("refuses to sell more than are left", () => {
    const concert = new Concert(3, 20);
    expect(() => concert.buy(4)).toThrowError("Not enough seats left");
  });

  it("refuses to sell no tickets", () => {
    const concert = new Concert(10, 20);
    expect(() => concert.buy(0)).toThrowError("Buy at least 1 ticket");
  });
});
