import pytest

from rich.padding import Padding


def test_unpack():
    assert Padding.unpack(3) == (3, 3, 3, 3)
    assert Padding.unpack((3,)) == (3, 3, 3, 3)
    assert Padding.unpack((3, 4)) == (3, 4, 3, 4)
    assert Padding.unpack((3, 4, 5, 6)) == (3, 4, 5, 6)
    with pytest.raises(ValueError):
        Padding.unpack((1, 2, 3))
