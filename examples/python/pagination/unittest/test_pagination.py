import unittest
from pagination import page, page_count


class PaginationTest(unittest.TestCase):
    # Bad: a loop that asks the code for its own answers, so its bugs slip through
    def test_pages(self):
        items = ["a", "b", "c", "d", "e"]
        for number in range(1, page_count(len(items), 2) + 1):
            start = (number - 1) * 2
            self.assertEqual(page(items, number, 2), items[start:start + 2])

    # Good: the pages, and what they hold, written out
    def test_5_items_make_3_pages_of_2(self):
        count = page_count(5, 2)
        self.assertEqual(count, 3)

    def test_the_first_page_holds_the_first_items(self):
        shown = page(["a", "b", "c", "d", "e"], 1, 2)
        self.assertEqual(shown, ["a", "b"])

    def test_the_last_page_holds_what_is_left(self):
        shown = page(["a", "b", "c", "d", "e"], 3, 2)
        self.assertEqual(shown, ["e"])

    def test_a_page_past_the_end_is_refused(self):
        with self.assertRaisesRegex(ValueError, "No such page"):
            page(["a", "b", "c", "d", "e"], 4, 2)

    def test_a_page_size_of_0_is_refused(self):
        with self.assertRaisesRegex(ValueError, "Page size must be at least 1"):
            page_count(5, 0)


if __name__ == "__main__":
    unittest.main()
