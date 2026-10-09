import pytest
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


@pytest.fixture
def bookmarks():
    return Bookmarks(FakeStore())


def test_saves_each_new_bookmark(bookmarks):
    bookmarks.add("news.example")
    bookmarks.add("recipes.example")
    assert bookmarks.all() == ["news.example", "recipes.example"]


def test_saves_a_bookmark_only_once(bookmarks):
    bookmarks.add("maps.example")
    bookmarks.add("maps.example")
    assert bookmarks.all() == ["maps.example"]


def test_counts_each_bookmark_once(bookmarks):
    bookmarks.add("news.example")
    bookmarks.add("news.example")
    bookmarks.add("maps.example")
    assert bookmarks.total() == 2
