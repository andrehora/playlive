import { Converter, Rates } from "./converter";

// Stub: returns a fixed rate
class StubRates implements Rates {
  constructor(private eur: number) {}

  rate() {
    return this.eur;
  }
}

describe("Converter", () => {
  it("converts dollars to euros", () => {
    const converter = new Converter(new StubRates(0.5));
    expect(converter.toEuros(10)).toBe(5);
  });

  it("follows the rate", () => {
    const converter = new Converter(new StubRates(2));
    expect(converter.toEuros(10)).toBe(20);
  });
});
