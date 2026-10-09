const { settings, greet } = require("./language");

describe("Language", () => {
  // Teardown: afterEach runs after every test, even one that fails, and puts
  // the setting back. Without it, the next test greets in Portuguese
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
