import unittest
from session import current_user, greeting, login, logout


# Bad: the second test needs the first one's login. Run it alone and it fails
class SharedLoginTest(unittest.TestCase):
    def test_ana_can_log_in(self):
        login("ana", "secret1")
        self.assertEqual(current_user(), "ana")

    def test_the_greeting_names_the_user(self):
        self.assertEqual(greeting(), "Hello, ana")


# Good: each test starts logged out
class SessionTest(unittest.TestCase):
    def setUp(self):
        logout()

    def test_a_user_can_log_in(self):
        login("ben", "secret2")
        user = current_user()
        self.assertEqual(user, "ben")

    def test_the_greeting_names_whoever_logged_in(self):
        login("ben", "secret2")
        message = greeting()
        self.assertEqual(message, "Hello, ben")

    def test_no_one_is_logged_in_at_first(self):
        with self.assertRaisesRegex(ValueError, "No one is logged in"):
            current_user()

    def test_a_wrong_password_is_refused(self):
        with self.assertRaisesRegex(ValueError, "Wrong name or password"):
            login("ben", "nope")


if __name__ == "__main__":
    unittest.main()
