def is_anagram(first, second):
    return _letters(first) == _letters(second)


def _letters(text):
    return sorted(c.lower() for c in text if c.isalpha())
