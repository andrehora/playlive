import { TodoService } from "./todo-service";

// Good: a fake repository, the to-dos kept in an object. A few lines, and it
// behaves like the real one
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
  // Bad: a mock told what to answer at every step, even what the list looks like
  // after completing. The test checks the mock's script more than the service
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
