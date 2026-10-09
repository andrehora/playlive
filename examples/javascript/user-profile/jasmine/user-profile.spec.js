const { makeProfile } = require("./user-profile");

describe("User profile", () => {
  // Bad: it compares the whole profile, so a new field breaks it
  it("makes the whole profile", () => {
    expect(makeProfile("Ana", "ana@example.test")).toEqual({ name: "Ana", email: "ana@example.test" });
  });

  // Good: each test checks only what it is about
  it("trims the name", () => {
    const name = makeProfile("  Ana ", "ana@example.test").name;
    expect(name).toBe("Ana");
  });

  it("lowercases the email", () => {
    const email = makeProfile("Ana", "Ana@Example.TEST").email;
    expect(email).toBe("ana@example.test");
  });

  it("refuses a blank name", () => {
    expect(() => makeProfile("   ", "ana@example.test")).toThrowError("Name is required");
  });
});
