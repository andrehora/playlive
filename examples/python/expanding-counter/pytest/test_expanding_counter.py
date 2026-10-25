from expanding_counter import Counter


def test_starts_at_zero():
    counter = Counter()
    assert counter.value == 0


def test_increment_adds_one():
    counter = Counter()
    counter.increment()
    assert counter.value == 1


def test_multiple_increments():
    counter = Counter()
    counter.increment()
    counter.increment()
    counter.increment()
    assert counter.value == 3


def test_increment_and_decrement():
    counter = Counter()
    counter.increment()
    counter.decrement()
    assert counter.value == 0


def test_stops_decrementing_at_zero():
    counter = Counter()
    counter.decrement()
    assert counter.value == 0


def test_reset_goes_back_to_zero():
    counter = Counter()
    counter.increment()
    counter.increment()
    counter.reset()
    assert counter.value == 0


def test_undo_reverts_increment():
    counter = Counter()
    counter.increment()
    counter.undo()
    assert counter.value == 0


def test_undo_reverts_reset():
    counter = Counter()
    counter.increment()
    counter.increment()
    counter.reset()
    counter.undo()
    assert counter.value == 2


def test_undo_with_nothing_to_undo():
    counter = Counter()
    counter.undo()
    assert counter.value == 0
