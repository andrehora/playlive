const { PasswordPolicy } = require("./password-policy");

describe("Password policy", () => {
  // Bad: it calls a private method, so inlining _hasDigit breaks it, though
  // problems() and isValid() still work
  it("finds a digit", () => {
    const policy = new PasswordPolicy();
    expect(policy._hasDigit("abc1")).toBe(true);
    expect(policy._hasDigit("abc")).toBe(false);
  });

  // Good: through problems() and isValid(), as callers use them
  it("finds a good password valid", () => {
    const policy = new PasswordPolicy();
    const valid = policy.isValid("Secret123");
    expect(valid).toBe(true);
  });

  it("finds a short password too short", () => {
    const policy = new PasswordPolicy();
    const problems = policy.problems("Sec1");
    expect(problems).toContain("too short");
  });

  it("wants a digit", () => {
    const policy = new PasswordPolicy();
    const problems = policy.problems("Secretpass");
    expect(problems).toContain("no digit");
  });

  it("wants a capital", () => {
    const policy = new PasswordPolicy();
    const problems = policy.problems("secret123");
    expect(problems).toContain("no capital");
  });

  it("lets the minimum length change", () => {
    const policy = new PasswordPolicy(4);
    const valid = policy.isValid("Ab12");
    expect(valid).toBe(true);
  });
});
