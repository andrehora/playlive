import unittest
from unittest.mock import Mock
from doorbell import Doorbell


class DoorbellTest(unittest.TestCase):
    # Mock: replaces the phone and checks how it was called
    def setUp(self):
        self.phone = Mock()
        self.doorbell = Doorbell(self.phone)

    def test_tells_the_phone_who_is_there(self):
        self.doorbell.ring("Ana")
        self.phone.notify.assert_called_once_with("Ana is at the door")

    def test_a_muted_doorbell_stays_quiet(self):
        self.doorbell.mute()
        self.doorbell.ring("Ana")
        self.phone.notify.assert_not_called()


if __name__ == "__main__":
    unittest.main()
