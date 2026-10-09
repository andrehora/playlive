import unittest
from unittest.mock import Mock
from backup import FileStore, backup


class BackupTest(unittest.TestCase):
    # Bad: it mocks CloudSDK, which is not ours, so CloudSDK's changes break it
    def test_backup_puts_each_note_in_the_cloud(self):
        sdk = Mock()
        sdk.put_object.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}
        self.assertEqual(backup([("a.txt", "hi")], FileStore(sdk, "my-bucket")), 1)
        sdk.put_object.assert_called_once_with({"Bucket": "my-bucket", "Key": "notes/a.txt", "Body": "hi"})

    # Good: it mocks FileStore, our own wrapper around CloudSDK
    def test_each_note_is_saved(self):
        store = Mock()
        store.save.return_value = True
        saved = backup([("a.txt", "hi"), ("b.txt", "yo")], store)
        self.assertEqual(saved, 2)

    def test_empty_notes_are_skipped(self):
        store = Mock()
        saved = backup([("a.txt", "  ")], store)
        self.assertEqual(saved, 0)
        store.save.assert_not_called()

    def test_a_failed_save_stops_the_backup(self):
        store = Mock()
        store.save.return_value = False
        with self.assertRaisesRegex(OSError, "Could not save a.txt"):
            backup([("a.txt", "hi")], store)


if __name__ == "__main__":
    unittest.main()
