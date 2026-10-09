import pytest
from pagination import page, page_count


# Bad: a loop, and the code's own sums to work out what each page should hold.
# It even asks page_count how many pages to try, so if page_count is wrong,
# the last page is never tried and the test still passes
def test_pages():
    items = ["a", "b", "c", "d", "e"]
    for number in range(1, page_count(len(items), 2) + 1):
        start = (number - 1) * 2
        assert page(items, number, 2) == items[start:start + 2]


# Good: the pages, and what they hold, written out
def test_5_items_make_3_pages_of_2():
    count = page_count(5, 2)
    assert count == 3


def test_the_first_page_holds_the_first_items():
    shown = page(["a", "b", "c", "d", "e"], 1, 2)
    assert shown == ["a", "b"]


def test_the_last_page_holds_what_is_left():
    shown = page(["a", "b", "c", "d", "e"], 3, 2)
    assert shown == ["e"]


def test_a_page_past_the_end_is_refused():
    with pytest.raises(ValueError, match="No such page"):
        page(["a", "b", "c", "d", "e"], 4, 2)


def test_a_page_size_of_0_is_refused():
    with pytest.raises(ValueError, match="Page size must be at least 1"):
        page_count(5, 0)
