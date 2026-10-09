import unittest
from gradebook import Gradebook


class GradebookTest(unittest.TestCase):
    # Bad: it compares the whole report, so a new field breaks it
    def test_reports_on_a_student(self):
        book = Gradebook({"Ana": [60, 80]})
        self.assertEqual(book.report("Ana"), {"student": "Ana", "average": 70, "passed": True})

    # Good: each test checks only what it is about
    def test_the_report_gives_the_average(self):
        book = Gradebook({"Ana": [60, 80]})
        average = book.report("Ana")["average"]
        self.assertEqual(average, 70)

    def test_an_average_of_50_passes(self):
        book = Gradebook({"Ben": [40, 60]})
        passed = book.report("Ben")["passed"]
        self.assertTrue(passed)

    def test_an_average_below_50_fails(self):
        book = Gradebook({"Cy": [30, 60]})
        passed = book.report("Cy")["passed"]
        self.assertFalse(passed)

    def test_an_added_score_counts(self):
        book = Gradebook({})
        book.add("Ana", 90)
        average = book.average("Ana")
        self.assertEqual(average, 90)

    def test_a_score_over_100_is_refused(self):
        book = Gradebook({})
        with self.assertRaisesRegex(ValueError, "Score must be between 0 and 100"):
            book.add("Ana", 101)

    def test_a_student_with_no_scores_has_no_average(self):
        book = Gradebook({})
        with self.assertRaisesRegex(ValueError, "No scores for Dee"):
            book.average("Dee")


if __name__ == "__main__":
    unittest.main()
