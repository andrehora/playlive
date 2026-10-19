import pytest

from rich.style import Style


def test_pick_first():
    with pytest.raises(ValueError):
        Style.pick_first()
