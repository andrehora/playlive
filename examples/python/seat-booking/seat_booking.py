def book(seats_left, wanted):
    if wanted <= 0:
        raise ValueError("Book at least 1 seat")
    # A bug to try: if wanted >= seats_left:
    if wanted > seats_left:
        raise ValueError("Not enough seats")
    return seats_left - wanted
