@classmethod
def pick_first(cls, *values: Optional[StyleType]) -> StyleType:
    """Pick first non-None style."""
    for value in values:
        if value is not None:
            return value
    raise ValueError("expected at least one non-None style")
