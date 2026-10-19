def __contains__(self, other: object) -> bool:
    if isinstance(other, str):
        return other in self.plain
    elif isinstance(other, Text):
        return other.plain in self.plain
    return False
