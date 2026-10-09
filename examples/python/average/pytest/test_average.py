from average import average, print_average


# Bad: it tests through print, so any change to the wording breaks it
def test_prints_the_average(capsys):
    print_average([6, 9])
    assert capsys.readouterr().out == "Average: 7.5\n"


# Good: average returns its result, so the tests just compare
def test_averages_the_scores():
    mean = average([6, 9])
    assert mean == 7.5


def test_no_scores_average_zero():
    mean = average([])
    assert mean == 0
