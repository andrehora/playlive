from museum import entry_fee


def test_a_child_who_is_a_student_pays_a_quarter():
    assert entry_fee(8, student=True) == 3
