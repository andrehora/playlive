import shutil
import tempfile
from pathlib import Path
import pytest
from photos import photos_in


# One folder for every test. Teardown once: the code after yield removes it
# after the last test
@pytest.fixture(scope="module")
def folder():
    path = Path(tempfile.mkdtemp())
    (path / "cake.jpg").touch()
    (path / "beach.jpg").touch()
    (path / "notes.txt").touch()
    yield path
    shutil.rmtree(path)


def test_lists_the_photos_in_order(folder):
    assert photos_in(folder) == ["beach.jpg", "cake.jpg"]


def test_leaves_out_other_files(folder):
    assert "notes.txt" not in photos_in(folder)
