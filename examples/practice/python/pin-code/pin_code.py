def is_valid_pin(pin):
    return (
        len(pin) == 4
        and pin.isdigit()
        and len(set(pin)) > 1
    )
