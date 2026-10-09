import unittest
from invitations import invite


# Spy, by hand: counts the emails instead of sending them
class SpyMailer:
    def __init__(self):
        self.sent = 0

    def send(self, to, text):
        self.sent += 1


class InvitationsTest(unittest.TestCase):
    def setUp(self):
        self.mailer = SpyMailer()

    def test_each_guest_gets_an_email(self):
        invite(["ana@example.test", "ben@example.test"], self.mailer)
        self.assertEqual(self.mailer.sent, 2)

    def test_a_blank_address_gets_no_email(self):
        invite(["ana@example.test", ""], self.mailer)
        self.assertEqual(self.mailer.sent, 1)

    def test_no_guests_get_no_email(self):
        invite([], self.mailer)
        self.assertEqual(self.mailer.sent, 0)


if __name__ == "__main__":
    unittest.main()
