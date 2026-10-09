from unittest.mock import Mock
import reminders


# Bad: it mocks is_overdue, our own rule, so the rule is never tested. This
# invoice is due on day 10 and today is day 5, yet a reminder goes out
def test_sends_a_reminder(monkeypatch):
    monkeypatch.setattr(reminders, "is_overdue", lambda due_day, today: True)
    mailer = Mock()
    assert reminders.remind("ana@example.test", 10, 5, mailer) is True


# Good: only the mailer, the boundary, is mocked; the rule runs for real
def test_an_overdue_invoice_gets_a_reminder():
    mailer = Mock()
    sent = reminders.remind("ana@example.test", 10, 11, mailer)
    assert sent is True
    mailer.send.assert_called_once_with("ana@example.test", "Your invoice is overdue")


def test_an_invoice_due_today_gets_none():
    mailer = Mock()
    sent = reminders.remind("ana@example.test", 10, 10, mailer)
    assert sent is False
    mailer.send.assert_not_called()
