from water import state


# No test checks "steam": check Coverage to see the line that never runs
def test_water_freezes_at_0():
    assert state(0) == "ice"


def test_water_is_liquid_at_20():
    assert state(20) == "water"
