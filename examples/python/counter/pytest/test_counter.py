from counter import Counter


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


def test_reset_goes_back_to_zero():
    counter = Counter()
    counter.increment()
    counter.increment()
    counter.reset()
    assert counter.value == 0
