from rich.text import Text


def test_align_left():
    text = Text("foo")
    text.align("left", 10)
    assert text.plain == "foo       "


def test_align_right():
    text = Text("foo")
    text.align("right", 10)
    assert text.plain == "       foo"


def test_align_center():
    text = Text("foo")
    text.align("center", 10)
    assert text.plain == "   foo    "
