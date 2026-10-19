from rich.console import Console
from rich.style import Style
from rich.text import Text


def test_get_style_at_offset():
    console = Console()
    text = Text.from_markup("Hello [b]World[/b]")
    assert text.get_style_at_offset(console, 0) == Style()
    assert text.get_style_at_offset(console, 6) == Style(bold=True)
