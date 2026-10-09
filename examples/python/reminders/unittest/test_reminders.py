import unittest
from unittest.mock import Mock, patch
import reminders


class RemindersTest(unittest.TestCase):
    # Bad: it mocks is_overdue, our own rule, so the rule is never tested. This
    # invoice is due on day 10 and today is day 5, yet a reminder goes out
    def test_sends_a_reminder(self):
        with patch("reminders.is_overdue", return_value=True):
            mailer = Mock()
            self.assertTrue(reminders.remind("ana@example.test", 10, 5, mailer))

    # Good: only the mailer, the boundary, is mocked; the rule runs for real
    def test_an_overdue_invoice_gets_a_reminder(self):
        mailer = Mock()
        sent = reminders.remind("ana@example.test", 10, 11, mailer)
        self.assertTrue(sent)
        mailer.send.assert_called_once_with("ana@example.test", "Your invoice is overdue")

    def test_an_invoice_due_today_gets_none(self):
        mailer = Mock()
        sent = reminders.remind("ana@example.test", 10, 10, mailer)
        self.assertFalse(sent)
        mailer.send.assert_not_called()


if __name__ == "__main__":
    unittest.main()
