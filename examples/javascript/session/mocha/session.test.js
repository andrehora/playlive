const { expect } = require("chai");
const { currentUser, greeting, login, logout } = require("./session");

// Bad: the second test counts on the login the first one left behind, so it
// passes only right after it. Run it alone and it fails
describe("Shared login", () => {
  it("lets Ana log in", () => {
    login("ana", "secret1");
    expect(currentUser()).to.equal("ana");
  });

  it("greets the user by name", () => {
    expect(greeting()).to.equal("Hello, ana");
  });
});

// Good: each test starts logged out, and logs in whoever it needs
describe("Session", () => {
  beforeEach(() => {
    logout();
  });

  it("lets a user log in", () => {
    login("ben", "secret2");
    const user = currentUser();
    expect(user).to.equal("ben");
  });

  it("greets whoever logged in", () => {
    login("ben", "secret2");
    const message = greeting();
    expect(message).to.equal("Hello, ben");
  });

  it("has no one logged in at first", () => {
    expect(() => currentUser()).to.throw("No one is logged in");
  });

  it("refuses a wrong password", () => {
    expect(() => login("ben", "nope")).to.throw("Wrong name or password");
  });
});
