from receipt import receipt


# Bad: it compares every line, so a new line on the receipt breaks it, though
# nothing it is about changed
def test_prints_the_receipt():
    assert receipt([("Tea", 3), ("Cake", 4)]) == ["Tea: 3", "Cake: 4", "Total: 7"]


# Good: each test looks for the line it is about, so new lines leave it alone
def test_the_total_is_shown():
    lines = receipt([("Tea", 3), ("Cake", 4)])
    assert "Total: 7" in lines


def test_each_item_is_shown():
    lines = receipt([("Tea", 3), ("Cake", 4)])
    assert "Cake: 4" in lines
