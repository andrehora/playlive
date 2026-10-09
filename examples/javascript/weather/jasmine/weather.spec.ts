import { Forecast, whatToWear } from "./weather";

describe("Weather", () => {
  // Bad: it mocks SkyApi, which is not ours, so it copies SkyApi's path and its
  // nested reply, and breaks whenever SkyApi changes them
  it("wears a coat in the cold", () => {
    const api = jasmine.createSpyObj("api", { fetch: { data: { current: { temp_c: 8 } } } });
    expect(whatToWear("Oslo", new Forecast(api))).toBe("Coat");
    expect(api.fetch).toHaveBeenCalledOnceWith("/current?city=Oslo");
  });

  // Good: it mocks Forecast, our own small interface in front of SkyApi
  it("makes below 15 coat weather", () => {
    const forecast = jasmine.createSpyObj("forecast", { temperature: 14 });
    const clothes = whatToWear("Oslo", forecast);
    expect(clothes).toBe("Coat");
  });

  it("makes 15 T-shirt weather", () => {
    const forecast = jasmine.createSpyObj("forecast", { temperature: 15 });
    const clothes = whatToWear("Lisbon", forecast);
    expect(clothes).toBe("T-shirt");
  });
});
