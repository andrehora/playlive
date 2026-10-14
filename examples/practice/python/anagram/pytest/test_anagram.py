import pytest
from anagram import is_anagram


def test_spots_an_anagram():
    assert is_anagram("listen", "silent")


def test_ignores_case():
    assert is_anagram("Listen", "Silent")


def test_ignores_spaces():
    assert is_anagram("Dormitory", "Dirty room")


def test_ignores_punctuation():
    assert is_anagram("The eyes", "They see!")


def test_spots_words_that_are_not_anagrams():
    assert not is_anagram("hello", "world")
