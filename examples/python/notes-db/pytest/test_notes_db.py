import sqlite3

import pytest
from notes_db import Notes


# Each test gets its own empty database, closed when the test ends
@pytest.fixture
def db():
    connection = sqlite3.connect(":memory:")
    yield connection
    connection.close()


@pytest.fixture
def notes(db):
    return Notes(db)


def test_starts_with_no_notes(notes):
    assert notes.count() == 0


def test_gives_the_first_note_id_1(notes):
    assert notes.add("Buy milk") == 1


def test_counts_the_notes_added(notes):
    notes.add("Buy milk")
    notes.add("Call Rui")
    assert notes.count() == 2


def test_deletes_a_note(notes):
    note_id = notes.add("Buy milk")
    notes.delete(note_id)
    assert notes.count() == 0
