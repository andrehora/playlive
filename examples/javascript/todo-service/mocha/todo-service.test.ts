import { expect } from "chai";
import * as sinon from "sinon";
import { TodoService } from "./todo-service";

// Fake: the to-dos kept in an object
class InMemoryTodos {
  todos: Record<number, { id: number; title: string; done: boolean }> = {};

  save(todo: { id: number; title: string; done: boolean }) {
    this.todos[todo.id] = todo;
  }

  get(id: number) {
    return this.todos[id];
  }

  all() {
    return Object.values(this.todos);
  }
}

describe("To-do service", () => {
  // Bad: a mock scripted at every step. It tests the script, not the service
  it("takes a completed to-do off the list", () => {
    const repo = { all: sinon.stub().returns([]), get: sinon.stub(), save: sinon.stub() };
    const service = new TodoService(repo);
    service.add("Buy milk");
    repo.get.returns({ id: 1, title: "Buy milk", done: false });
    service.complete(1);
    repo.all.returns([{ id: 1, title: "Buy milk", done: true }]);
    expect(service.pending()).to.deep.equal([]);
  });

  // Good: the fake
  it("lists an added to-do as pending", () => {
    const service = new TodoService(new InMemoryTodos());
    service.add("Buy milk");
    expect(service.pending()).to.deep.equal(["Buy milk"]);
  });

  it("no longer lists a completed to-do", () => {
    const service = new TodoService(new InMemoryTodos());
    const milk = service.add("Buy milk");
    service.add("Buy bread");
    service.complete(milk);
    expect(service.pending()).to.deep.equal(["Buy bread"]);
  });

  it("refuses a blank title", () => {
    const service = new TodoService(new InMemoryTodos());
    expect(() => service.add("   ")).to.throw("Title is required");
  });
});
