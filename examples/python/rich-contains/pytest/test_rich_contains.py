from rich.text import Text


def test_contain():
    text = Text("foobar")
    assert "foo" in text
    assert "foo " not in text
    assert Text("bar") in text
    assert None not in text
