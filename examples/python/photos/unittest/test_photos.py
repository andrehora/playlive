import shutil
import tempfile
import unittest
from pathlib import Path
from photos import photos_in


class PhotosTest(unittest.TestCase):
    # One folder for every test, filled before the first
    @classmethod
    def setUpClass(cls):
        cls.folder = Path(tempfile.mkdtemp())
        (cls.folder / "cake.jpg").touch()
        (cls.folder / "beach.jpg").touch()
        (cls.folder / "notes.txt").touch()

    # Teardown once: tearDownClass removes the folder after the last test, even a failing one
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.folder)

    def test_lists_the_photos_in_order(self):
        self.assertEqual(photos_in(self.folder), ["beach.jpg", "cake.jpg"])

    def test_leaves_out_other_files(self):
        self.assertNotIn("notes.txt", photos_in(self.folder))


if __name__ == "__main__":
    unittest.main()
