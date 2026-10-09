const { CoffeeCard } = require("./coffee-card");

describe("Coffee card", () => {
  // Bad: one test holds every behavior. Its name doesn't say which broke
  it("buy", () => {
    const card = new CoffeeCard();
    expect(card.buy(3)).toBe(3);
    expect(card.stamps).toBe(1);
    for (let i = 0; i < 8; i++) card.buy(3);
    expect(card.buy(3)).toBe(0);
    expect(card.stamps).toBe(0);
  });

  // Good: one test per behavior, named for what it does
  it("charges a coffee at its price", () => {
    const card = new CoffeeCard();
    const price = card.buy(3);
    expect(price).toBe(3);
  });

  it("earns a stamp for each coffee", () => {
    const card = new CoffeeCard(4);
    card.buy(3);
    expect(card.stamps).toBe(5);
  });

  it("gives the tenth coffee free", () => {
    const card = new CoffeeCard(9);
    const price = card.buy(3);
    expect(price).toBe(0);
  });

  it("starts a new card after a free coffee", () => {
    const card = new CoffeeCard(9);
    card.buy(3);
    expect(card.stamps).toBe(0);
  });
});
