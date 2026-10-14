import pytest
from elevator import Elevator, OverCapacity


def test_people_who_enter_are_counted():
    elevator = Elevator(8)
    elevator.enter(3)
    assert elevator.people == 3


def test_entering_with_no_one_is_refused():
    elevator = Elevator(8)
    with pytest.raises(ValueError, match="Count must be positive"):
        elevator.enter(0)


def test_entering_over_capacity_is_refused():
    elevator = Elevator(8)
    elevator.enter(6)
    with pytest.raises(OverCapacity):
        elevator.enter(3)


def test_a_refused_entry_leaves_the_count_alone():
    elevator = Elevator(8)
    elevator.enter(6)
    with pytest.raises(OverCapacity):
        elevator.enter(3)
    assert elevator.people == 6
