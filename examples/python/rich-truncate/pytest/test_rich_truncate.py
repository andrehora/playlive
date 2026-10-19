import pytest

from rich.text import Text


@pytest.mark.parametrize(
    "input, count, expected",
    [
        ("Hello", 10, "Hello"),
        ("Hello", 5, "Hello"),
        ("Hello", 4, "Hel…"),
        ("Hello", 3, "He…"),
        ("Hello", 2, "H…"),
        ("Hello", 1, "…"),
    ],
)
def test_truncate_ellipsis(input, count, expected):
    text = Text(input)
    text.truncate(count, overflow="ellipsis")
    assert text.plain == expected


@pytest.mark.parametrize(
    "input, count, expected",
    [
        ("Hello", 5, "Hello"),
        ("Hello", 10, "Hello     "),
        ("Hello", 3, "He…"),
    ],
)
def test_truncate_ellipsis_pad(input, count, expected):
    text = Text(input)
    text.truncate(count, overflow="ellipsis", pad=True)
    assert text.plain == expected
