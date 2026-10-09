import pytest
from time_input import parse_time


# Bad: only the happy path. Empty, a missing colon, letters, hours and minutes
# out of range, and the first and last minute of the day are never tried
def test_reads_a_time():
    assert parse_time("09:30") == 570


# Good: the unhappy paths and the edges too
def test_an_empty_time_is_refused():
    with pytest.raises(ValueError, match="Time is required"):
        parse_time("  ")


def test_a_time_without_a_colon_is_refused():
    with pytest.raises(ValueError, match="Use the form HH:MM"):
        parse_time("930")


def test_letters_are_refused():
    with pytest.raises(ValueError, match="Use digits only"):
        parse_time("ab:cd")


def test_hour_24_is_refused():
    with pytest.raises(ValueError, match="No such time"):
        parse_time("24:00")


def test_minute_60_is_refused():
    with pytest.raises(ValueError, match="No such time"):
        parse_time("12:60")


def test_midnight_is_0():
    minutes = parse_time("00:00")
    assert minutes == 0


def test_the_last_minute_of_the_day_is_1439():
    minutes = parse_time("23:59")
    assert minutes == 1439
