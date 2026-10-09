const { expect } = require("chai");
const { settings, greet } = require("./language");

describe("Language", () => {
  // Teardown: afterEach puts the setting back after every test, even a failing one
  afterEach(() => {
    settings.language = "en";
  });

  it("can greet in Portuguese", () => {
    settings.language = "pt";
    expect(greet("Ana")).to.equal("Olá, Ana");
  });

  it("greets in English", () => {
    expect(greet("Ana")).to.equal("Hello, Ana");
  });
});
