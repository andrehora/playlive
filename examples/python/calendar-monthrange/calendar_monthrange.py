def monthrange(year, month):
    """Return weekday of first day of month (0-6 ~ Mon-Sun)
       and number of days (28-31) for year, month."""
    _validate_month(month)
    day1 = weekday(year, month, 1)
    ndays = mdays[month] + (month == FEBRUARY and isleap(year))
    return day1, ndays
