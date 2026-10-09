from types import SimpleNamespace
from unittest.mock import Mock
import birthday


# Bad: send_greetings reads the real date, so the test has to fake the clock,
# and knows how send_greetings reads it
def test_greets_on_the_day(monkeypatch):
    monkeypatch.setattr(birthday, "datetime", SimpleNamespace(now=lambda: "2026-10-09 08:00:00"))
    mailer = Mock()
    assert birthday.send_greetings([("Ana", "1990-10-09")], mailer) == 1
    mailer.send.assert_called_once_with("Happy birthday, Ana!")


# Good: birthday_messages is handed the day, so the tests just compare
def test_someone_born_today_is_greeted():
    employees = [("Ana", "1990-10-09"), ("Ben", "1985-03-02")]
    messages = birthday.birthday_messages(employees, "2026-10-09")
    assert messages == ["Happy birthday, Ana!"]


def test_no_one_is_greeted_on_an_ordinary_day():
    employees = [("Ana", "1990-10-09"), ("Ben", "1985-03-02")]
    messages = birthday.birthday_messages(employees, "2026-06-01")
    assert messages == []
