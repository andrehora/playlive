const { TodoService } = require("./todo-service");

// Fake: the to-dos kept in an object
class InMemoryTodos {
  todos = {};

  save(todo) {
    this.todos[todo.id] = todo;
  }

  get(id) {
    return this.todos[id];
  }

  all() {
    return Object.values(this.todos);
  }
}

describe("To-do service", () => {
  // Bad: a mock scripted at every step. It tests the script, not the service
  it("takes a completed to-do off the list", () => {
    const repo = jasmine.createSpyObj("repo", ["all", "get", "save"]);
    repo.all.and.returnValue([]);
    const service = new TodoService(repo);
    service.add("Buy milk");
    repo.get.and.returnValue({ id: 1, title: "Buy milk", done: false });
    service.complete(1);
    repo.all.and.returnValue([{ id: 1, title: "Buy milk", done: true }]);
    expect(service.pending()).toEqual([]);
  });

  // Good: the fake
  it("lists an added to-do as pending", () => {
    const service = new TodoService(new InMemoryTodos());
    service.add("Buy milk");
    expect(service.pending()).toEqual(["Buy milk"]);
  });

  it("no longer lists a completed to-do", () => {
    const service = new TodoService(new InMemoryTodos());
    const milk = service.add("Buy milk");
    service.add("Buy bread");
    service.complete(milk);
    expect(service.pending()).toEqual(["Buy bread"]);
  });

  it("refuses a blank title", () => {
    const service = new TodoService(new InMemoryTodos());
    expect(() => service.add("   ")).toThrowError("Title is required");
  });
});
