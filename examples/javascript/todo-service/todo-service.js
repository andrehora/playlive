class TodoService {
  constructor(repo) {
    this.repo = repo;
  }

  add(title) {
    if (!title.trim()) {
      throw new Error("Title is required");
    }
    const todo = { id: this.repo.all().length + 1, title, done: false };
    this.repo.save(todo);
    return todo.id;
  }

  complete(id) {
    const todo = this.repo.get(id);
    // A bug to try: todo.done = false;
    todo.done = true;
    this.repo.save(todo);
  }

  pending() {
    return this.repo.all().filter((todo) => !todo.done).map((todo) => todo.title);
  }
}

module.exports = { TodoService };
