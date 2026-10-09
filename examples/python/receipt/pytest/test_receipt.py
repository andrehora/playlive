from receipt import receipt


# Bad: it compares every line, so any new line breaks it
def test_prints_the_receipt():
    assert receipt([("Tea", 3), ("Cake", 4)]) == ["Tea: 3", "Cake: 4", "Total: 7"]


# Good: each test looks only for its own line
def test_the_total_is_shown():
    lines = receipt([("Tea", 3), ("Cake", 4)])
    assert "Total: 7" in lines


def test_each_item_is_shown():
    lines = receipt([("Tea", 3), ("Cake", 4)])
    assert "Cake: 4" in lines
