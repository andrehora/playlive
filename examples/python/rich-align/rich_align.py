def align(self, align: AlignMethod, width: int, character: str = " ") -> None:
    """Align text to a given width.

    Args:
        align (AlignMethod): One of "left", "center", or "right".
        width (int): Desired width.
        character (str, optional): Character to pad with. Defaults to " ".
    """
    self.truncate(width)
    excess_space = width - cell_len(self.plain)
    if excess_space:
        if align == "left":
            self.pad_right(excess_space, character)
        elif align == "center":
            left = excess_space // 2
            self.pad_left(left, character)
            self.pad_right(excess_space - left, character)
        else:
            self.pad_left(excess_space, character)
