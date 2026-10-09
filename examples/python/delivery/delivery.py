from datetime import date


# Orders ship the same day, but not at the weekend
def ships_today(today=None):
    if today is None:
        today = date.today()
    day = today.strftime("%A")
    return day != "Saturday" and day != "Sunday"
