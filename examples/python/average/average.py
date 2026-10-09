# Easy to test: it takes the scores and returns the result
def average(scores):
    if not scores:
        return 0
    total = 0
    for score in scores:
        total += score
    return total / len(scores)


# Hard to test: it prints the result, so a test has to catch what is printed.
# Keeping it this thin leaves almost nothing in it to test
def print_average(scores):
    # A change to try: print("Mean:", average(scores))
    print("Average:", average(scores))
