import greeting


# Stub: returns a fixed hour
def test_morning(monkeypatch):
    monkeypatch.setattr(greeting, "current_hour", lambda: 9)
    assert greeting.greet("Ana") == "Good morning, Ana"


def test_afternoon(monkeypatch):
    monkeypatch.setattr(greeting, "current_hour", lambda: 15)
    assert greeting.greet("Ana") == "Good afternoon, Ana"


def test_evening(monkeypatch):
    monkeypatch.setattr(greeting, "current_hour", lambda: 20)
    assert greeting.greet("Ana") == "Good evening, Ana"
