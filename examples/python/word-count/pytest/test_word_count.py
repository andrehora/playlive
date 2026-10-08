from word_count import count_words


def test_counts_each_word():
    assert count_words("the cat and the hat") == {"the": 2, "cat": 1, "and": 1, "hat": 1}


def test_ignores_case_and_punctuation():
    assert count_words("Go, go, GO!") == {"go": 3}


def test_empty_text_has_no_words():
    assert count_words("") == {}
