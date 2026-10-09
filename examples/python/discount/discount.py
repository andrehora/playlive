# 10% off from 100
def discounted(price):
    # A bug to try: if price > 100:
    if price >= 100:
        return price * 90 / 100
    return price
