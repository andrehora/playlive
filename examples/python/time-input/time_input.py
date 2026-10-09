# "HH:MM" as minutes since midnight
def parse_time(text):
    text = text.strip()
    if not text:
        raise ValueError("Time is required")
    parts = text.split(":")
    if len(parts) != 2:
        raise ValueError("Use the form HH:MM")
    hours, minutes = parts
    if not hours.isdigit() or not minutes.isdigit():
        raise ValueError("Use digits only")
    h, m = int(hours), int(minutes)
    # A bug to try: if h > 24 or m > 59:
    if h > 23 or m > 59:
        raise ValueError("No such time")
    return h * 60 + m
