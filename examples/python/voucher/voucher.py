from datetime import date


def is_expired(expires, today=None):
    if today is None:
        today = date.today()
    # A bug to try: return today >= expires
    return today > expires
