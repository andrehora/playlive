from leap_year import is_leap


# Bad: a loop, and a formula of its own to work out the answer. The formula is
# wrong (1900 was not a leap year), but none of the years it tries shows it
def test_leap_years():
    for year in range(2000, 2030):
        assert is_leap(year) == (year % 4 == 0)


# Good: the years and their answers, written out
def test_a_year_divisible_by_4_is_leap():
    leap = is_leap(2024)
    assert leap is True


def test_other_years_are_not_leap():
    leap = is_leap(2023)
    assert leap is False


def test_a_century_is_not_leap():
    leap = is_leap(1900)
    assert leap is False


def test_every_400_years_a_century_is_leap():
    leap = is_leap(2000)
    assert leap is True
