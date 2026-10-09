class TodoService:
    def __init__(self, repo):
        self.repo = repo

    def add(self, title):
        if not title.strip():
            raise ValueError("Title is required")
        todo = {"id": len(self.repo.all()) + 1, "title": title, "done": False}
        self.repo.save(todo)
        return todo["id"]

    def complete(self, todo_id):
        todo = self.repo.get(todo_id)
        # A bug to try: todo["done"] = False
        todo["done"] = True
        self.repo.save(todo)

    def pending(self):
        return [todo["title"] for todo in self.repo.all() if not todo["done"]]
