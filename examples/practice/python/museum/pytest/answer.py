from museum import entry_fee


# Every line runs in the first test, but each "if" also has a way round it:
# branch coverage shows the ways no test takes
def test_a_child_who_is_a_student_pays_a_quarter():
    assert entry_fee(8, student=True) == 3


def test_a_child_pays_half():
    assert entry_fee(8) == 6


def test_a_student_pays_half():
    assert entry_fee(30, student=True) == 6


def test_an_adult_pays_in_full():
    assert entry_fee(30) == 12
