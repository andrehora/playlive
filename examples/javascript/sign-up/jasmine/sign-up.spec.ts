import { SignUp } from "./sign-up";

// Fake: users kept in a list
class FakeUsers {
  emails: string[] = [];

  exists(email: string) {
    return this.emails.includes(email);
  }

  save(email: string) {
    this.emails.push(email);
  }
}

describe("Sign-up", () => {
  // Bad: a mock only knows what it was told
  it("registers a new email", () => {
    const users = jasmine.createSpyObj("users", { exists: false, save: undefined });
    expect(new SignUp(users).register("ana@example.test")).toBe("Welcome, ana@example.test");
    expect(users.save).toHaveBeenCalledOnceWith("ana@example.test");
  });

  // Good: the fake
  it("welcomes a new email", () => {
    const signUp = new SignUp(new FakeUsers());
    const message = signUp.register("ana@example.test");
    expect(message).toBe("Welcome, ana@example.test");
  });

  it("lets an email register only once", () => {
    const signUp = new SignUp(new FakeUsers());
    signUp.register("ana@example.test");
    expect(() => signUp.register("ana@example.test")).toThrowError("Email already registered");
  });
});
