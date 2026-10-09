import unittest
from unittest.mock import Mock
from door_lock import ConsoleLog, DoorLock


class DoorLockTest(unittest.TestCase):
    # Spy: records each call to the real log, which still runs
    def setUp(self):
        self.log = Mock(wraps=ConsoleLog())
        self.lock = DoorLock("1234", self.log)

    def test_the_right_code_unlocks(self):
        self.lock.unlock("1234")
        self.log.write.assert_called_once_with("Unlocked")

    def test_a_wrong_code_is_logged(self):
        self.lock.unlock("0000")
        self.log.write.assert_called_once_with("Wrong code")


if __name__ == "__main__":
    unittest.main()
