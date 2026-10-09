def receipt(items):
    # A change to try: lines = ["Thanks for shopping"]
    lines = []
    total = 0
    for name, price in items:
        lines.append(name + ": " + str(price))
        total += price
    lines.append("Total: " + str(total))
    return lines
