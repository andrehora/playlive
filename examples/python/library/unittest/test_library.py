import unittest
from library import Library


# Bad: the helpers hide who borrows, how many books, and the limit, so you
# have to read them to know what test_lending checks
def library_with_loans(n):
    library = Library()
    for i in range(n):
        library.lend("ana", "Book " + str(i))
    return library


def lend_one_more(library):
    library.lend("ana", "One more")
    return library.count("ana")


class LibraryTest(unittest.TestCase):
    def test_lending(self):
        self.assertEqual(lend_one_more(library_with_loans(2)), 3)

    # Good: each test shows all it needs, even if the steps repeat
    def test_a_member_can_borrow_a_book(self):
        library = Library(limit=3)
        library.lend("Ana", "Dune")
        self.assertEqual(library.count("Ana"), 1)

    def test_a_member_at_the_limit_is_refused(self):
        library = Library(limit=2)
        library.lend("Ana", "Dune")
        library.lend("Ana", "Emma")
        with self.assertRaisesRegex(ValueError, "Limit reached"):
            library.lend("Ana", "Ulysses")

    def test_each_member_has_their_own_books(self):
        library = Library(limit=1)
        library.lend("Ana", "Dune")
        library.lend("Ben", "Dune")
        self.assertEqual(library.count("Ben"), 1)


if __name__ == "__main__":
    unittest.main()
