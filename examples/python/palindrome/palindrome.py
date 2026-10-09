def is_palindrome(text):
    letters = [c.lower() for c in text if c.isalpha()]
    return letters == list(reversed(letters))
