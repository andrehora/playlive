import pytest
from unittest.mock import Mock
from backup import FileStore, backup


# Bad: it mocks CloudSDK, which is not ours, so it copies CloudSDK's request and
# its deeply nested reply, and breaks whenever CloudSDK changes them
def test_backup_puts_each_note_in_the_cloud():
    sdk = Mock()
    sdk.put_object.return_value = {"ResponseMetadata": {"HTTPStatusCode": 200}}
    assert backup([("a.txt", "hi")], FileStore(sdk, "my-bucket")) == 1
    sdk.put_object.assert_called_once_with({"Bucket": "my-bucket", "Key": "notes/a.txt", "Body": "hi"})


# Good: it mocks FileStore, our own small interface in front of CloudSDK
def test_each_note_is_saved():
    store = Mock()
    store.save.return_value = True
    saved = backup([("a.txt", "hi"), ("b.txt", "yo")], store)
    assert saved == 2


def test_empty_notes_are_skipped():
    store = Mock()
    saved = backup([("a.txt", "  ")], store)
    assert saved == 0
    store.save.assert_not_called()


def test_a_failed_save_stops_the_backup():
    store = Mock()
    store.save.return_value = False
    with pytest.raises(OSError, match="Could not save a.txt"):
        backup([("a.txt", "hi")], store)
