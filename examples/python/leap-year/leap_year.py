def is_leap(year):
    # A bug to try: return year % 4 == 0
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)
