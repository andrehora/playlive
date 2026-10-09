import pytest
from unittest.mock import Mock
from door_lock import ConsoleLog, DoorLock


# Spy: records each call to the real log, which still runs
@pytest.fixture
def log():
    return Mock(wraps=ConsoleLog())


@pytest.fixture
def lock(log):
    return DoorLock("1234", log)


def test_the_right_code_unlocks(lock, log):
    lock.unlock("1234")
    log.write.assert_called_once_with("Unlocked")


def test_a_wrong_code_is_logged(lock, log):
    lock.unlock("0000")
    log.write.assert_called_once_with("Wrong code")
