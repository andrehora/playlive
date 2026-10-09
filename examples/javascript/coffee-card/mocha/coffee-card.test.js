const { expect } = require("chai");
const { CoffeeCard } = require("./coffee-card");

describe("Coffee card", () => {
  // Bad: one test for the method, holding four behaviors. When it
  // fails, its name doesn't say which one broke
  it("buy", () => {
    const card = new CoffeeCard();
    expect(card.buy(3)).to.equal(3);
    expect(card.stamps).to.equal(1);
    for (let i = 0; i < 8; i++) card.buy(3);
    expect(card.buy(3)).to.equal(0);
    expect(card.stamps).to.equal(0);
  });

  // Good: one test per behavior, named for what it does
  it("charges a coffee at its price", () => {
    const card = new CoffeeCard();
    const price = card.buy(3);
    expect(price).to.equal(3);
  });

  it("earns a stamp for each coffee", () => {
    const card = new CoffeeCard(4);
    card.buy(3);
    expect(card.stamps).to.equal(5);
  });

  it("gives the tenth coffee free", () => {
    const card = new CoffeeCard(9);
    const price = card.buy(3);
    expect(price).to.equal(0);
  });

  it("starts a new card after a free coffee", () => {
    const card = new CoffeeCard(9);
    card.buy(3);
    expect(card.stamps).to.equal(0);
  });
});
