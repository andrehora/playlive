const { Stack } = require("./stack");

describe("Stack", () => {
  let stack;

  // beforeEach runs before every test, so each one starts with a fresh stack
  beforeEach(() => {
    stack = new Stack();
  });

  it("pops the last item pushed", () => {
    stack.push(1);
    stack.push(2);
    expect(stack.pop()).toBe(2);
    expect(stack.size).toBe(1);
  });

  it("peeks without removing", () => {
    stack.push(1);
    expect(stack.peek()).toBe(1);
    expect(stack.size).toBe(1);
  });

  it("refuses to pop an empty stack", () => {
    expect(() => stack.pop()).toThrowError("Pop from an empty stack");
  });
});
