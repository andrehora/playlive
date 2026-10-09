import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch
import birthday


class BirthdayTest(unittest.TestCase):
    # Bad: send_greetings reads the real date, so the test must fake the clock
    def test_greets_on_the_day(self):
        with patch("birthday.datetime", SimpleNamespace(now=lambda: "2026-10-09 08:00:00")):
            mailer = Mock()
            self.assertEqual(birthday.send_greetings([("Ana", "1990-10-09")], mailer), 1)
            mailer.send.assert_called_once_with("Happy birthday, Ana!")

    # Good: birthday_messages is handed the day
    def test_someone_born_today_is_greeted(self):
        employees = [("Ana", "1990-10-09"), ("Ben", "1985-03-02")]
        messages = birthday.birthday_messages(employees, "2026-10-09")
        self.assertEqual(messages, ["Happy birthday, Ana!"])

    def test_no_one_is_greeted_on_an_ordinary_day(self):
        employees = [("Ana", "1990-10-09"), ("Ben", "1985-03-02")]
        messages = birthday.birthday_messages(employees, "2026-06-01")
        self.assertEqual(messages, [])


if __name__ == "__main__":
    unittest.main()
