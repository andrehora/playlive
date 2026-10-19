def clamp(
    self, min_width: Optional[int] = None, max_width: Optional[int] = None
) -> "Measurement":
    """Clamp a measurement within the specified range.

    Args:
        min_width (int): Minimum desired width, or ``None`` for no minimum. Defaults to None.
        max_width (int): Maximum desired width, or ``None`` for no maximum. Defaults to None.

    Returns:
        Measurement: New Measurement object.
    """
    measurement = self
    if min_width is not None:
        measurement = measurement.with_minimum(min_width)
    if max_width is not None:
        measurement = measurement.with_maximum(max_width)
    return measurement
