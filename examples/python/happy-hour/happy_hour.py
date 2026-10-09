from datetime import datetime


# Drinks are half price from 17:00 to 18:59
def drink_price(price, now=None):
    if now is None:
        now = datetime.now()
    if now.hour >= 17 and now.hour < 19:
        return price / 2
    return price
