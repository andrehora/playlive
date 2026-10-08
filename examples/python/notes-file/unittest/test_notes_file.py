import os
import tempfile
import unittest
from notes_file import save_notes, load_notes


class NotesFileTest(unittest.TestCase):
    # Each test gets its own empty folder, removed again afterwards
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.folder.name, "notes.txt")

    def tearDown(self):
        self.folder.cleanup()

    def test_saved_notes_load_back(self):
        save_notes(self.path, ["Buy milk", "Call Ana"])
        self.assertEqual(load_notes(self.path), ["Buy milk", "Call Ana"])

    def test_a_missing_file_has_no_notes(self):
        self.assertEqual(load_notes(self.path), [])


if __name__ == "__main__":
    unittest.main()
