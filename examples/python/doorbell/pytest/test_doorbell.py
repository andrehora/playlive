import pytest
from unittest.mock import Mock
from doorbell import Doorbell


# Mock: replaces the phone and checks how it was called
@pytest.fixture
def phone():
    return Mock()


@pytest.fixture
def doorbell(phone):
    return Doorbell(phone)


def test_tells_the_phone_who_is_there(doorbell, phone):
    doorbell.ring("Ana")
    phone.notify.assert_called_once_with("Ana is at the door")


def test_a_muted_doorbell_stays_quiet(doorbell, phone):
    doorbell.mute()
    doorbell.ring("Ana")
    phone.notify.assert_not_called()
