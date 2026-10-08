import unittest
from word_count import count_words


class WordCountTest(unittest.TestCase):
    def test_counts_each_word(self):
        self.assertEqual(count_words("the cat and the hat"), {"the": 2, "cat": 1, "and": 1, "hat": 1})

    def test_ignores_case_and_punctuation(self):
        self.assertEqual(count_words("Go, go, GO!"), {"go": 3})

    def test_empty_text_has_no_words(self):
        self.assertEqual(count_words(""), {})


if __name__ == "__main__":
    unittest.main()
