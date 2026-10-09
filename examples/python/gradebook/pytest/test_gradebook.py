import pytest
from gradebook import Gradebook


# Bad: it compares the whole report, so a new field breaks it
def test_reports_on_a_student():
    book = Gradebook({"Ana": [60, 80]})
    assert book.report("Ana") == {"student": "Ana", "average": 70, "passed": True}


# Good: each test checks only what it is about
def test_the_report_gives_the_average():
    book = Gradebook({"Ana": [60, 80]})
    average = book.report("Ana")["average"]
    assert average == 70


def test_an_average_of_50_passes():
    book = Gradebook({"Ben": [40, 60]})
    passed = book.report("Ben")["passed"]
    assert passed is True


def test_an_average_below_50_fails():
    book = Gradebook({"Cy": [30, 60]})
    passed = book.report("Cy")["passed"]
    assert passed is False


def test_an_added_score_counts():
    book = Gradebook({})
    book.add("Ana", 90)
    average = book.average("Ana")
    assert average == 90


def test_a_score_over_100_is_refused():
    book = Gradebook({})
    with pytest.raises(ValueError, match="Score must be between 0 and 100"):
        book.add("Ana", 101)


def test_a_student_with_no_scores_has_no_average():
    book = Gradebook({})
    with pytest.raises(ValueError, match="No scores for Dee"):
        book.average("Dee")
