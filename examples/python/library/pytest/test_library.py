import pytest
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


def test_lending():
    assert lend_one_more(library_with_loans(2)) == 3


# Good: each test shows all it needs, even if the steps repeat
def test_a_member_can_borrow_a_book():
    library = Library(limit=3)
    library.lend("Ana", "Dune")
    assert library.count("Ana") == 1


def test_a_member_at_the_limit_is_refused():
    library = Library(limit=2)
    library.lend("Ana", "Dune")
    library.lend("Ana", "Emma")
    with pytest.raises(ValueError, match="Limit reached"):
        library.lend("Ana", "Ulysses")


def test_each_member_has_their_own_books():
    library = Library(limit=1)
    library.lend("Ana", "Dune")
    library.lend("Ben", "Dune")
    assert library.count("Ben") == 1
