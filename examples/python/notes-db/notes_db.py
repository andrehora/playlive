import sqlite3


class Notes:
    def __init__(self, db):
        self.db = db
        self.db.execute("CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, text TEXT NOT NULL)")

    def add(self, text):
        return self.db.execute("INSERT INTO notes (text) VALUES (?)", (text,)).lastrowid

    def delete(self, note_id):
        self.db.execute("DELETE FROM notes WHERE id = ?", (note_id,))

    def count(self):
        return self.db.execute("SELECT COUNT(*) FROM notes").fetchone()[0]
