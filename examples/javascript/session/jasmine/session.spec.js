const { currentUser, greeting, login, logout } = require("./session");

// Bad: the second test needs the first one's login. Run it alone and it fails
describe("Shared login", () => {
  it("lets Ana log in", () => {
    login("ana", "secret1");
    expect(currentUser()).toBe("ana");
  });

  it("greets the user by name", () => {
    expect(greeting()).toBe("Hello, ana");
  });
});

// Good: each test starts logged out
describe("Session", () => {
  beforeEach(() => {
    logout();
  });

  it("lets a user log in", () => {
    login("ben", "secret2");
    const user = currentUser();
    expect(user).toBe("ben");
  });

  it("greets whoever logged in", () => {
    login("ben", "secret2");
    const message = greeting();
    expect(message).toBe("Hello, ben");
  });

  it("has no one logged in at first", () => {
    expect(() => currentUser()).toThrowError("No one is logged in");
  });

  it("refuses a wrong password", () => {
    expect(() => login("ben", "nope")).toThrowError("Wrong name or password");
  });
});
