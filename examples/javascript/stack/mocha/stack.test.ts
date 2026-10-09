import { expect } from "chai";
import { Stack } from "./stack";

describe("Stack", () => {
  let stack: Stack<number>;

  // beforeEach runs before every test, so each one starts with a fresh stack
  beforeEach(() => {
    stack = new Stack();
  });

  it("pops the last item pushed", () => {
    stack.push(1);
    stack.push(2);
    expect(stack.pop()).to.equal(2);
    expect(stack.size).to.equal(1);
  });

  it("peeks without removing", () => {
    stack.push(1);
    expect(stack.peek()).to.equal(1);
    expect(stack.size).to.equal(1);
  });

  it("refuses to pop an empty stack", () => {
    expect(() => stack.pop()).to.throw("Pop from an empty stack");
  });
});
