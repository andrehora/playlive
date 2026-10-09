const { Converter } = require("./converter");

// Stub, by hand: returns a fixed rate
class StubBankService {
  rate() {
    return 0.5;
  }
}

describe("Converter", () => {
  it("converts dollars to euros", () => {
    const dollars = 10;
    const converter = new Converter(new StubBankService());

    const euros = converter.toEuros(dollars);

    expect(euros).toBe(5);
  });

  it("converts any amount", () => {
    const dollars = 3;
    const converter = new Converter(new StubBankService());

    const euros = converter.toEuros(dollars);

    expect(euros).toBe(1.5);
  });
});
