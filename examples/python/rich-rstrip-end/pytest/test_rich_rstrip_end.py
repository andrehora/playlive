from rich.text import Text


def test_rstrip_end():
    text = Text("Hello, World!    ")
    text.rstrip_end(14)
    assert str(text) == "Hello, World! "
