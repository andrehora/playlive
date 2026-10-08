from notes_file import save_notes, load_notes


# tmp_path is a built-in fixture: an empty folder of its own for each test
def test_saved_notes_load_back(tmp_path):
    path = tmp_path / "notes.txt"
    save_notes(path, ["Buy milk", "Call Ana"])
    assert load_notes(path) == ["Buy milk", "Call Ana"]


def test_a_missing_file_has_no_notes(tmp_path):
    assert load_notes(tmp_path / "notes.txt") == []
