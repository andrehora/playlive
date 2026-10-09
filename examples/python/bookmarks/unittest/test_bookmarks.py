import unittest
from bookmarks import Bookmarks


# Fake: a simple store that really works, in a list
class FakeStore:
    def __init__(self):
        self.urls = []

    def has(self, url):
        return url in self.urls

    def save(self, url):
        self.urls.append(url)

    def all(self):
        return list(self.urls)


class BookmarksTest(unittest.TestCase):
    def setUp(self):
        self.bookmarks = Bookmarks(FakeStore())

    def test_saves_each_new_bookmark(self):
        self.bookmarks.add("news.example")
        self.bookmarks.add("recipes.example")
        self.assertEqual(self.bookmarks.all(), ["news.example", "recipes.example"])

    def test_saves_a_bookmark_only_once(self):
        self.bookmarks.add("maps.example")
        self.bookmarks.add("maps.example")
        self.assertEqual(self.bookmarks.all(), ["maps.example"])

    def test_counts_each_bookmark_once(self):
        self.bookmarks.add("news.example")
        self.bookmarks.add("news.example")
        self.bookmarks.add("maps.example")
        self.assertEqual(self.bookmarks.total(), 2)


if __name__ == "__main__":
    unittest.main()
