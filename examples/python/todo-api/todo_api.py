import requests

# The app's own API. Tests cannot reach it
BASE_URL = "https://api.todo-app.example"


class TodoApi:
    def __init__(self, base_url=BASE_URL):
        self.base_url = base_url

    def todo(self, todo_id):
        response = requests.get(f"{self.base_url}/todos/{todo_id}", timeout=10)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()

    def todos_of(self, user_id):
        response = requests.get(f"{self.base_url}/users/{user_id}/todos", timeout=10)
        response.raise_for_status()
        return response.json()

    def add(self, todo):
        response = requests.post(f"{self.base_url}/todos", json=todo, timeout=10)
        response.raise_for_status()
        return response.json()


# Takes any TodoApi: the real one in the app, a fake one in tests
class TodoList:
    def __init__(self, api):
        self.api = api

    def title_of(self, todo_id):
        todo = self.api.todo(todo_id)
        return todo["title"] if todo else None

    def pending(self, user_id):
        return [todo["title"] for todo in self.api.todos_of(user_id) if not todo["completed"]]

    def progress(self, user_id):
        todos = self.api.todos_of(user_id)
        done = sum(1 for todo in todos if todo["completed"])
        return f"{done} of {len(todos)} done"

    def add(self, user_id, title):
        if not title.strip():
            raise ValueError("Title is required")
        return self.api.add({"userId": user_id, "title": title, "completed": False})["id"]
