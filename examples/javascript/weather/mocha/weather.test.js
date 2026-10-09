const { expect } = require("chai");
const sinon = require("sinon");
const { Forecast, whatToWear } = require("./weather");

describe("Weather", () => {
  // Bad: it mocks SkyApi, which is not ours, so SkyApi's changes break it
  it("wears a coat in the cold", () => {
    const api = { fetch: sinon.stub().returns({ data: { current: { temp_c: 8 } } }) };
    expect(whatToWear("Oslo", new Forecast(api))).to.equal("Coat");
    expect(api.fetch.calledOnceWith("/current?city=Oslo")).to.equal(true);
  });

  // Good: it mocks Forecast, our own wrapper around SkyApi
  it("makes below 15 coat weather", () => {
    const forecast = { temperature: sinon.stub().returns(14) };
    const clothes = whatToWear("Oslo", forecast);
    expect(clothes).to.equal("Coat");
  });

  it("makes 15 T-shirt weather", () => {
    const forecast = { temperature: sinon.stub().returns(15) };
    const clothes = whatToWear("Lisbon", forecast);
    expect(clothes).to.equal("T-shirt");
  });
});
