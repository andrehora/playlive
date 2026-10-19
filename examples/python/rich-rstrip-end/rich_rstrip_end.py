def rstrip_end(self, size: int) -> None:
    """Remove whitespace beyond a certain width at the end of the text.

    Args:
        size (int): The desired size of the text.
    """
    text_length = len(self)
    if text_length > size:
        excess = text_length - size
        whitespace_match = _re_whitespace.search(self.plain)
        if whitespace_match is not None:
            whitespace_count = len(whitespace_match.group(0))
            self.right_crop(min(whitespace_count, excess))
