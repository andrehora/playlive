def to_bool(val):
    if isinstance(val, str):
        val = val.lower()

    if val in (True, "true", "t", "yes", "y", "on", "1", 1):
        return True
    if val in (False, "false", "f", "no", "n", "off", "0", 0):
        return False

    msg = f"Cannot convert value to bool: {val!r}"
    raise ValueError(msg)
