export interface Todo {
  id: number;
  title: string;
  done: boolean;
}

export interface Todos {
  save(todo: Todo): void;
  get(id: number): Todo;
  all(): Todo[];
}

export class TodoService {
  constructor(private repo: Todos) {}

  add(title: string): number {
    if (!title.trim()) {
      throw new Error("Title is required");
    }
    const todo = { id: this.repo.all().length + 1, title, done: false };
    this.repo.save(todo);
    return todo.id;
  }

  complete(id: number): void {
    const todo = this.repo.get(id);
    // A bug to try: todo.done = false;
    todo.done = true;
    this.repo.save(todo);
  }

  pending(): string[] {
    return this.repo.all().filter((todo) => !todo.done).map((todo) => todo.title);
  }
}
