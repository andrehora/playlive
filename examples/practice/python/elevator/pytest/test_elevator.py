import pytest
from elevator import Elevator, OverCapacity


def test_people_who_enter_are_counted():
    elevator = Elevator(8)
    elevator.enter(3)
    assert elevator.people == 3
