from shopping_list import parse, summary


# == compares what is inside, item by item. "is" would ask whether both are
# the same object, and a list written in the test never is
def test_splits_the_text_into_items():
    assert parse("milk, bread") == ["milk", "bread"]


def test_sums_up_the_list():
    assert summary(["milk", "bread"]) == {"count": 2, "first": "milk"}
