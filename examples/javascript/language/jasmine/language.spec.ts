import { settings, greet } from "./language";

describe("Language", () => {
  // Teardown: afterEach puts the setting back after every test, even a failing one
  afterEach(() => {
    settings.language = "en";
  });

  it("can greet in Portuguese", () => {
    settings.language = "pt";
    expect(greet("Ana")).toBe("Olá, Ana");
  });

  it("greets in English", () => {
    expect(greet("Ana")).toBe("Hello, Ana");
  });
});
