import { Stack } from "./stack";

describe("Stack", () => {
  let stack: Stack<number>;

  // beforeEach runs before every test, so each one starts with a fresh stack
  beforeEach(() => {
    stack = new Stack();
    stack.push(1);
    stack.push(2);
  });

  it("pops the last item pushed", () => {
    expect(stack.pop()).toBe(2);
    expect(stack.size).toBe(1);
  });

  it("peeks without removing", () => {
    expect(stack.peek()).toBe(2);
    expect(stack.size).toBe(2);
  });

  it("refuses to pop an empty stack", () => {
    stack.pop();
    stack.pop();
    expect(() => stack.pop()).toThrowError("Pop from an empty stack");
  });
});
